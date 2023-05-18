const Promise = require('bluebird')
const { JsonRpcProvider, Wallet } = require('quais')
const walletsJson = require('./wallets.json')
const { info, warn, error } = require('./logger')
const {
  getRandomAddressInShard,
  lookupTxPending,
  nodeData,
  sleep,
  sendRawTransaction,
  QUAI_CONTEXTS
} = require('./utils')

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
const interval = 10000
let feeData
let walletStart = 0
let walletEnd = 80

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
      try {
        await sendRawTransaction(providerUrl, signed)
      } catch (e) {
        error('error sending transaction', e)
        nonce = await provider.getTransactionCount(wallet.address, 'pending')
        feeData = await provider.getFeeData()
        continue
      }
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

  const wallets = walletsJson[selectedGroup][selectedZone].slice(walletStart, walletEnd).map((wallet) => new Wallet(wallet.privateKey, provider))
  memPoolSize = (await lookupTxPending(providerUrl))[0]
  feeData = await provider.getFeeData()

  const start = Date.now()
  latest = start

  setInterval(async () => {
    memPoolSize = (await lookupTxPending(providerUrl))?.[0] || memPoolSize
    if (memPoolSize > memPoolMax) warn('mempool full')
  }, 1000 * 3)

  setInterval(async () => {
    const tps = transactions / ((Date.now() - latest) / 1000)
    transactions = 0
    latest = Date.now()
    info('tps check', { tps, walletEnd })
  }, 1000 * 30)

  setInterval(async () => {
    feeData = await provider.getFeeData()
  }, 1000 * 30)

  // setInterval(async () => {
  //   const newWallets = walletsJson[selectedGroup][selectedZone].slice(walletStart, walletEnd).map((wallet) => new Wallet(wallet.privateKey, provider))
  //   walletStart = walletEnd
  //   walletEnd += 40
  //   await Promise.map(newWallets, transact)
  // }, 1000 * 60 * 60 * 1)

  await Promise.map(wallets, transact)
})()
