const Promise = require('bluebird')
const {Wallet, WebSocketProvider} = require('quais')
const walletsJson = require('./wallets.json')
const {
    generateRandomAddressInShard,
    lookupChainId,
    lookupTxPending,
    nodeData,
    networks,
    sleep,
    QUAI_CONTEXTS
} = require('./utils')
const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')

const argv = yargs(hideBin(process.argv))
    .option('group', {
        alias: 'g',
        type: 'number',
        default: 0,
        description: 'Selected group'
    })
    .option('zone', {
        alias: 'z',
        type: 'string',
        default: 'zone-0-0',
        description: 'Selected zone'
    })
    .option('host', {
        alias: 'h',
        type: 'string',
        default: 'localhost',
        description: 'Host name'
    })
    .argv

const groupNumber = argv.group
const selectedGroup = `group-${groupNumber}`
const selectedZone = argv.zone
const host = argv.host
const wsProviderUrl = `ws://${host}:${nodeData[selectedZone].ws}`
const httpProviderUrl = `http://${host}:${nodeData[selectedZone].http}`

const provider = new WebSocketProvider(wsProviderUrl)

let pending, queued, chainId, latest, feeData, loValue, hiValue, memPoolMax, interval, etxFreq,
    generateAbsoluteRandomRatio, info, debug, warn, error, machinesRunning, numSlices, blockTime, targetTps // initialize atomics

const Kp = 0.003 //, Ki = 0.05

let transactions = 0;
let tps = 0;
let oldTps = 0

const externalShards = QUAI_CONTEXTS.filter((shard) => shard.shard !== selectedZone)
const selectedShard = QUAI_CONTEXTS.find((shard) => shard.shard === selectedZone)

function getRandomExternalAddress() {
    const randomZone = externalShards[Math.floor(Math.random() * externalShards.length)]
    if (Math.random() < generateAbsoluteRandomRatio) {
        return generateRandomAddressInShard(randomZone)
    }
    const addresses = walletsJson[selectedGroup][randomZone.shard].map((wallet) => wallet.address)
    return addresses[Math.floor(Math.random() * addresses.length)]
}

function getRandomInternalAddress() {
    if (Math.random() < generateAbsoluteRandomRatio) {
        return generateRandomAddressInShard(selectedShard)
    }
    const addresses = walletsJson[selectedGroup][selectedZone].map((wallet) => wallet.address)
    return addresses[Math.floor(Math.random() * addresses.length)]
}

async function genRawTransaction(nonce) {
    const value = Math.floor(Math.random() * (hiValue - loValue + 1) + loValue)
    const isExternal = Math.random() < etxFreq

    let to, type

    if (isExternal) { // is external this time
        to = getRandomExternalAddress()
        type = 2
    } else {
        to = getRandomInternalAddress()
        type = 0
    }

    const ret = {
        to,
        value,
        nonce,
        // gasLimit: feeData.gasPrice,
        gasLimit: 42000,
        maxFeePerGas: feeData.maxFeePerGas * BigInt(2),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        type,
        chainId
    }
    if (isExternal) { // is external this time
        ret.externalGasLimit = BigInt(100000)
        ret.externalGasPrice = feeData.maxFeePerGas * BigInt(2)
        ret.externalGasTip = feeData.maxPriorityFeePerGas * BigInt(2)
    }
    return ret
}

function loadLogger(config) {
    const log = require('./logger')(config?.log.winston.opts.level)
    info = log.info
    warn = log.warn
    error = log.error
    debug = log.debug
}

async function transact({wallet, nonce} = {}) {
    if (queued > memPoolMax / numSlices) {
        nonce = await provider.getTransactionCount(wallet.address, 'pending')
    }
    if (pending < memPoolMax && (!wallet?.lastSent || Date.now() - wallet.lastSent > blockTime)) {
        const raw = await genRawTransaction(nonce)
        debug('sending transaction', {
            pending,
            queued,
            nonce, ...feeData,
            address: wallet.address,
            tx: JSON.stringify(raw, (key, value) => (typeof value === 'bigint' ? value.toString() : value))
        })
        wallet.lastSent = Date.now()
        await wallet.sendTransaction(raw)
        transactions++
    }
}

;(async () => {
    chainId = await lookupChainId(httpProviderUrl)
    const network = networks[chainId]
    if (!network) throw new Error(`network not found for chainId ${chainId}`)
    process.env.NODE_ENV = network
    const config = require('config')

    loadLogger(config)
    targetTps = config?.txs?.tps?.target
    memPoolMax = config?.memPool.max
    numSlices = config?.numSlices
    machinesRunning = config?.machinesRunning
    const walletUsed = walletsJson[selectedGroup][selectedZone].concat(walletsJson[`group-${groupNumber + machinesRunning}`][selectedZone])
    interval = 1000 / (targetTps / machinesRunning / numSlices)
    loValue = config?.txs.loValue
    hiValue = config?.txs.hiValue
    etxFreq = config?.txs.etxFreq
    generateAbsoluteRandomRatio = config?.txs.absoluteRandomAddressRatio
    blockTime = config?.blockTime

    info('Starting QUAI load test', {
        shard: selectedShard.shard,
        selectedGroup,
        walletSize: walletUsed.length,
        interval
    })

    if (config?.dumpConfig) info('loaded', {config: JSON.stringify(config, null, 2)})

    const wallets = await Promise.map(walletUsed, async (wallet) => {
        return ({
            wallet: new Wallet(wallet.privateKey, provider),
            nonce: await provider.getTransactionCount(wallet.address, 'pending')
        })
    })

    async function startTransaction(wallet, errorMessage) {
        try {
          if (['replacement transaction underpriced', 'nonce too low'].some(it => errorMessage?.includes(it))) {
              const was = wallet.nonce
              wallet.nonce = await provider.getTransactionCount(wallet.wallet.address, 'pending')
              warn("wallet nonce reset", {address: wallet.wallet.address, nonce: wallet.nonce, was})
              if (wallet.nonce <= was) error("got same problematic nonce again", {address: wallet.wallet.address, nonce: wallet.nonce, was})
          }
          errorMessage = undefined
          await transact(wallet)
        } catch (e) {
            error('error sending transaction', e?.error || e)
            errorMessage = e.error?.message || e.message
            if (errorMessage === 'intrinsic gas too low') {
                feeData = await provider.getFeeData()
            }
        }
        wallet.nonce++
        setTimeout(() => startTransaction(wallet, errorMessage), interval * wallets.length)
    }

    const pool = await lookupTxPending(httpProviderUrl)
    pending = pool?.pending
    queued = pool?.queued
    feeData = await provider.getFeeData()

    const start = Date.now()
    latest = start

    const setMemPoolSize = async (n) => {
        try {
            const response = await lookupTxPending(httpProviderUrl)
            pending = (response.pending || response.pending === 0) ? response.pending : pending
            queued = (response.queued || response.queued === 0) ? response.queued : queued
            if (pending > memPoolMax) warn('mempool full')
        } catch (e) {
            error('error getting mempool size', e)
            if (n && n < 3) await setMemPoolSize(n + 1)
        }
    }
    if (config?.memPool.check.enabled) setInterval(setMemPoolSize, config?.memPool.check.interval)

    if (config?.txs.tps.check.enabled) {
        setInterval(async () => {
            //tps = (tps + (transactions / ((Date.now() - latest) / 1000))) / 2
            tps = transactions / ((Date.now() - latest) / 1000)
            transactions = 0
            latest = Date.now()
            info('tps check', {tps, interval, targetTps: targetTps / machinesRunning / numSlices})

            //interval = interval - interval * Kp * (targetTps / machinesRunning / numSlices - tps)
            if (interval < 0) interval = 0
        }, config?.txs.tps.check.interval)
    }

    if (config?.feeData.check.enabled) {
        setInterval(async () => {
            feeData = await provider.getFeeData()
        }, config?.feeData.check.interval)
    }

    if (config?.txs.tps.increment.enabled) {
        setInterval(async () => {
            oldTps = targetTps
            targetTps += config?.txs.tps.increment.amount
            interval = oldTps / targetTps * interval
        }, config?.txs.tps.increment.interval)
    }
    for (let i = 0; i < wallets.length; i++) {
        startTransaction(wallets[i])
        await sleep(interval)
    }
})()
