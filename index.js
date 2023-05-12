const Promise = require('bluebird')
const { JsonRpcProvider, Wallet } = require('quais')
const walletsJson = require('./wallets.json')
const { info, warn } = require('./logger')
const { getRandomAddressInShard, lookupTxPending, nodeData, sleep, sendRawTransaction, QUAI_CONTEXTS } = require('./utils')

const host = 'localhost'
const protocol = 'http'
const selectedGroup = process.argv[2]
const selectedZone = process.argv[3]
const providerUrl = `${protocol}://${host}:${nodeData[selectedZone][protocol]}`
const loValue = 1
const hiValue = 100

const chainId = 15000
const etxFreq = 0.2
const provider = new JsonRpcProvider(providerUrl)
const memPoolMax = 9000

let memPoolSize
let transactions = 0
let latest
let interval = 4000
let desiredTps = 40 / 6
let feeData

const externalShards = QUAI_CONTEXTS.filter((shard) => shard.shard !== selectedZone)
const selectedShard = QUAI_CONTEXTS.find((shard) => shard.shard === selectedZone)

function getRandomExternalAddress () {
  return getRandomAddressInShard(externalShards[Math.floor(Math.random() * externalShards.length)])
}

function getRandomInternalAddress () {
  return getRandomAddressInShard(selectedShard)
}

async function genRawTransaction (wallet, nonce) {
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
  let nonce = await provider.getTransactionCount(wallet.address, 'pending')
  while (true) {
    const raw = await genRawTransaction(wallet, nonce)
    const signed = await wallet.signTransaction(raw)
    if (memPoolSize < memPoolMax) {
      transactions++
      await sendRawTransaction(providerUrl, signed)
    }
    await sleep(interval)
    if (nonce % 100 === 0) {
      nonce = await provider.getTransactionCount(wallet.address, 'pending')
    } else {
      nonce++
    }
  }
}

;(async () => {
  info('Starting QUAI load test', { shard: selectedShard.shard, selectedGroup })

  const wallets = walletsJson[selectedGroup][selectedZone].map((wallet) => new Wallet(wallet.privateKey, provider))
  memPoolSize = Math.max(...(await lookupTxPending(providerUrl)))
  feeData = await provider.getFeeData()

  const start = Date.now()
  latest = start

  setInterval(async () => {
    memPoolSize = Math.max(...(await lookupTxPending(providerUrl)))
    if (memPoolSize > memPoolMax) warn('mempool full')
  }, 1000 * 3)

  setInterval(async () => {
    const tps = transactions / ((Date.now() - latest) / 1000)
    transactions = 0
    latest = Date.now()
    if (tps < desiredTps) {
      interval -= 10 // should be based on desiredTps - tps
    } else {
      interval += 10
    }
    info('tps check', { tps, desiredTps, interval })
  }, 1000 * 30)

  setInterval(async () => {
    feeData = await provider.getFeeData()
  }, 1000 * 30)

  setInterval(async () => {
    desiredTps += 3.33
    if (desiredTps > 50) desiredTps = 50
  }, 1000 * 60 * 60 * 1)

  await Promise.map(wallets, transact)
})()
