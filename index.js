const Promise = require('bluebird')
const { Wallet, WebSocketProvider } = require('quais')
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
const { hideBin } = require('yargs/helpers')

const argv = yargs(hideBin(process.argv))
  .option('group', {
    alias: 'g',
    type: 'string',
    default: 'group-0',
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

const selectedGroup = argv.group
const selectedZone = argv.zone
const host = argv.host
const wsProviderUrl = `ws://${host}:${nodeData[selectedZone].ws}`
const httpProviderUrl = `http://${host}:${nodeData[selectedZone].http}`

const provider = new WebSocketProvider(wsProviderUrl)

let pending, queued, chainId, latest, feeData, loValue, hiValue, memPoolMax, interval, numNewWallets, etxFreq,
    generateAbsoluteRandomRatio, info, warn, error, machinesRunning, numSlices, blockTime, targetTps // initialize atomics

const Kp = 0.2//, Ki = 0.05

let transactions = 0

const externalShards = QUAI_CONTEXTS.filter((shard) => shard.shard !== selectedZone)
const selectedShard = QUAI_CONTEXTS.find((shard) => shard.shard === selectedZone)

function getRandomExternalAddress () {
  const randomZone = externalShards[Math.floor(Math.random() * externalShards.length)]
  if (Math.random() < generateAbsoluteRandomRatio) {
    return generateRandomAddressInShard(randomZone)
  }
  const addresses = walletsJson[selectedGroup][randomZone.shard].map((wallet) => wallet.address)
  return addresses[Math.floor(Math.random() * addresses.length)]
}

function getRandomInternalAddress () {
  if (Math.random() < generateAbsoluteRandomRatio) {
    return generateRandomAddressInShard(selectedShard)
  }
  const addresses = walletsJson[selectedGroup][selectedZone].map((wallet) => wallet.address)
  return addresses[Math.floor(Math.random() * addresses.length)]
}

async function genRawTransaction (nonce) {
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

function loadLogger (config) {
  const log = require('./logger')(config?.log.winston.opts.level)
  info = log.info
  warn = log.warn
  error = log.error
}

async function transact ({ wallet, nonce, backoff } = {}) {
  const raw = await genRawTransaction(nonce)
  if (queued > memPoolMax / numSlices) {
    nonce = await provider.getTransactionCount(wallet.address, 'pending')
  }
  if (pending < memPoolMax && (!wallet?.lastSent || Date.now() - wallet.lastSent > 2 * blockTime)) {
    transactions++
    try {
      info('sending transaction', { pending, queued, nonce, ...feeData, address: wallet.address, tx: JSON.stringify(raw, (key, value) => (typeof value === 'bigint' ? value.toString() : value)) })
      wallet.lastSent = Date.now()
      await wallet.sendTransaction(raw)
    } catch (e) {
      error('error sending transaction', e?.error || e)
      const errorMessage = e.error?.message || e.message
      if (errorMessage === 'intrinsic gas too low') {
        feeData = await provider.getFeeData()
      } // not an else if so both can be true
      if (['replacement transaction underpriced', 'nonce too low'].some(it => errorMessage.includes(it))) {
        nonce = await provider.getTransactionCount(wallet.address, 'pending')
      } else {
        nonce++
      }
      backoff++
      return ({ wallet, nonce, backoff })
    }
    nonce++
  }
  return ({ wallet, nonce, backoff: 0 })
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
  interval = 1000 / (targetTps / machinesRunning / numSlices)
  numNewWallets = Math.floor(config?.txs.tps.increment.amount / machinesRunning / numSlices * interval / 1000)
  loValue = config?.txs.loValue
  hiValue = config?.txs.hiValue
  etxFreq = config?.txs.etxFreq
  generateAbsoluteRandomRatio = config?.txs.absoluteRandomAddressRatio
  blockTime = config?.blockTime

  info('Starting QUAI load test', { shard: selectedShard.shard, selectedGroup })

  if (config?.dumpConfig) info('loaded', { config: JSON.stringify(config, null, 2) })

  const wallets = await Promise.map(walletsJson[selectedGroup][selectedZone], async (wallet) => {
    return ({ wallet: new Wallet(wallet.privateKey, provider), nonce: await provider.getTransactionCount(wallet.address, 'pending'), backoff: 0 })
  })
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
    } catch (e) {
      error('error getting mempool size', e)
      if (n && n < 3) await setMemPoolSize(n + 1)
    }
    if (pending > memPoolMax) warn('mempool full')
  }
  if (config?.memPool.check.enabled) setInterval(setMemPoolSize, config?.memPool.check.interval)

  if (config?.txs.tps.check.enabled) {
    setInterval(async () => {
      const tps = transactions / ((Date.now() - latest) / 1000)
      transactions = 0
      latest = Date.now()
      info('tps check', { tps, interval, targetTps: targetTps / machinesRunning / numSlices })

      interval = interval + Kp * (tps - targetTps / machinesRunning / numSlices)
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
      targetTps += config?.txs.tps.increment.amount
      interval = 1000 / (targetTps / machinesRunning / numSlices)
    }, config?.txs.tps.increment.interval)
  }

  let index = 0
  while (true) {
    const start = Date.now()
    wallets[index] = await transact(wallets[index])
    const sleepTime = Math.pow(1.1, wallets[index].backoff) * interval - (Date.now() - start) 
    await sleep(sleepTime > 0 ? sleepTime : 0)
    index = (index + 1) % wallets.length
  }
})()
