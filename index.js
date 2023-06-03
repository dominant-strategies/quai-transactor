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

let memPoolSize, chainId, latest, feeData, loValue, hiValue, memPoolMax, interval, walletStart, walletEnd,
  numNewWallets, etxFreq, generateAbsoluteRandomRatio, info, warn, error // initialize atomics
let transactions = 0

const externalShards = QUAI_CONTEXTS.filter((shard) => shard.shard !== selectedZone)
const selectedShard = QUAI_CONTEXTS.find((shard) => shard.shard === selectedZone)

function getRandomExternalAddress () {
  const randomZone = externalShards[Math.floor(Math.random() * externalShards.length)]
  if (Math.random() < generateAbsoluteRandomRatio) {
    return generateRandomAddressInShard(randomZone)
  }
  const addresses = walletsJson[selectedGroup][randomZone.shard].slice(walletStart, walletEnd).map((wallet) => wallet.address)
  return addresses[Math.floor(Math.random() * addresses.length)]
}

function getRandomInternalAddress () {
  if (Math.random() < generateAbsoluteRandomRatio) {
    return generateRandomAddressInShard(selectedShard)
  }
  const addresses = walletsJson[selectedGroup][selectedZone].slice(walletStart, walletEnd).map((wallet) => wallet.address)
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

async function transact (wallet) {
  await sleep(interval * Math.random())
  let nonce = await provider.getTransactionCount(wallet.address, 'pending')
  let backoff = 0
  while (true) {
    const raw = await genRawTransaction(nonce)
    if (memPoolSize < memPoolMax) {
      transactions++
      try {
        info('sending transaction', { memPoolSize, nonce, ...feeData, address: wallet.address })
        await wallet.sendTransaction(raw)
      } catch (e) {
        error('error sending transaction', e?.error || e)
        if (e.error?.message === 'intrinsic gas too low') {
          feeData = await provider.getFeeData()
        } // not an else if so both can be true
        if (!['replacement transaction underpriced', 'nonce too low'].includes(e.error?.message)) {
          await sleep(interval * Math.pow(1.1, backoff++))
          continue
        }
      }
      nonce++
      backoff = 0
    }
    await sleep(interval)
  }
}

;(async () => {
  chainId = await lookupChainId(httpProviderUrl)
  const network = networks[chainId]
  if (!network) throw new Error(`network not found for chainId ${chainId}`)
  process.env.NODE_ENV = network
  const config = require('config')
  const log = require('./logger')(config?.log.winston.opts.level)
  info = log.info
  warn = log.warn
  error = log.error

  memPoolMax = config?.memPool.max
  interval = config?.blockTime
  walletStart = 0
  walletEnd = config?.txs.tps.walletEnd
  loValue = config?.txs.loValue
  hiValue = config?.txs.hiValue
  etxFreq = config?.txs.etxFreq
  generateAbsoluteRandomRatio = config?.txs.absoluteRandomAddressRatio
  numNewWallets = config?.txs.tps.increment.amount

  info('Starting QUAI load test', { shard: selectedShard.shard, selectedGroup })
  if (config?.dumpConfig) info('loaded', JSON.stringify(config, null, 2))

  if (walletEnd > walletsJson[selectedGroup][selectedZone].length) {
    walletEnd = walletsJson[selectedGroup][selectedZone].length
    info('walletEnd is greater than the number of wallets in the group, setting walletEnd to the number of wallets in the group', { walletEnd })
  }

  const wallets = walletsJson[selectedGroup][selectedZone].slice(walletStart, walletEnd).map((wallet) => new Wallet(wallet.privateKey, provider))
  memPoolSize = (await lookupTxPending(httpProviderUrl))[0]
  feeData = await provider.getFeeData()

  const start = Date.now()
  latest = start

  const setMemPoolSize = async (n) => {
    try {
      const response = (await lookupTxPending(httpProviderUrl))?.[0]
      memPoolSize = (response || response === 0) ? response : memPoolSize
    } catch (e) {
      error('error getting mempool size', e)
      if (n && n < 3) await setMemPoolSize(n + 1)
    }
    if (memPoolSize > memPoolMax) warn('mempool full')
  }
  if (config?.memPool.check.enabled) setInterval(setMemPoolSize, config?.memPool.check.interval)

  if (config?.txs.tps.check.enabled) {
    setInterval(async () => {
      const tps = transactions / ((Date.now() - latest) / 1000)
      transactions = 0
      latest = Date.now()
      info('tps check', { tps, walletEnd })
    }, config?.txs.tps.check.interval)
  }

  if (config?.feeData.check.enabled) {
    setInterval(async () => {
      feeData = await provider.getFeeData()
    }, config?.feeData.check.interval)
  }

  if (config?.txs.tps.increment.enabled) {
    setInterval(async () => {
      if (walletEnd + numNewWallets <= walletsJson[selectedGroup][selectedZone].length) {
        walletStart = walletEnd
        walletEnd += numNewWallets
        const newWallets = walletsJson[selectedGroup][selectedZone].slice(walletStart, walletEnd).map((wallet) => new Wallet(wallet.privateKey, provider))
        await Promise.map(newWallets, transact)
      }
    }, config?.txs.tps.increment.interval)
  }

  await Promise.map(wallets, transact)
})()
