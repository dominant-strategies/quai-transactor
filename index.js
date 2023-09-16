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
  .option('count', {
    alias: 'c',
    type: 'number',
    default: '1',
    description: 'Count'
  })
  .option('test', {
    alias: 't',
    type: 'number',
    default: '1',
    description: 'Test'
  })
  .argv

const groupNumber = argv.group
const selectedGroup = `group-${groupNumber}`
const selectedZone = argv.zone
const host = argv.host
const count = argv.count
const test = argv.test
const wsProviderUrl = `ws://${host}:${nodeData[selectedZone].ws}`
const httpProviderUrl = `http://${host}:${nodeData[selectedZone].http}`

const provider = new WebSocketProvider(wsProviderUrl)

let pending, queued, chainId, latest, loValue, hiValue, memPoolMax, interval, etxFreq,
  generateAbsoluteRandomRatio, info, debug, warn, error, machinesRunning, numSlices, blockTime, targetTps, // initialize atomics
  freeze

let feeData = {}
let freezeCount = 0
let transactions = 0
let tps = 0
let oldTps = 0

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

async function genRawTransaction (nonce, double) {
  const value = 100000
  const isExternal = Math.random() < etxFreq
  feeData.maxFeePerGas = 30000000000n
  feeData.maxPriorityFeePerGas = 10000000000n
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
    maxFeePerGas: feeData.maxFeePerGas * BigInt(2) * (double ? BigInt(2) : BigInt(1)),
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas * (double ? BigInt(2) : BigInt(1)),
    type,
    chainId
  }
  if (isExternal) { // is external this time
    ret.externalGasLimit = BigInt(42000)
    ret.externalGasPrice = feeData.maxFeePerGas * BigInt(9) * (double ? BigInt(2) : BigInt(1))
    ret.externalGasTip = feeData.maxPriorityFeePerGas * BigInt(9) * (double ? BigInt(2) : BigInt(1))
  }
  
  switch (test) {
    case 1:
      //Expect: status = 1
        ret.to = getRandomInternalAddress()
        ret.type =0 
      break;
    case 2:
      //Expect: status = 0
        ret.to = getRandomInternalAddress()
        ret.type = 2 
      break;
    case 3:
      //Expect: status = 0 
        ret.to = getRandomInternalAddress()
        ret.type = 1 
      break;
    case 4:
      //Expect: status = 1
        ret.to = getRandomExternalAddress()
        ret.type = 2 
      break;
    case 5:
      //Expect: status = 0
        ret.to = getRandomExternalAddress()
        ret.type = 0 
      break;
    case 6:
      //Expect: status = 0 
        ret.to = getRandomExternalAddress()
        ret.type = 1 
      break;
    case 7:
      //Expect: status = 0
        ret.chainId = 1338 
      break;
    case 8:
      //Expect: status = 0
        ret.chainId = -2 
      break;
    case 9:
      //Expect: status = 0
        ret.chainId = BigInt(123481024567190263412039847120893562348905623458902374589)
      break;
    case 10:
      //Expect: status = 0
        ret.accessList = []
      break;
    case 11:
      //Expect: status = 0
        ret.data = BigInt(123481024567190263412039847120893562348905623458902374589)
      break;
    case 12:
      //Expect: status = 0
        ret.data = "dwjdw"
      break;
    case 13:
      //Expect: status = 1
        ret.data = ""
      break;
    case 14:
      //Expect: status = 0
        ret.data = ["0xdswd"]
      break;
    case 15:
      //Expect: status = 0
        ret.gasLimit = -1
      break;
    case 16:
      //Expect: status = 0
        ret.gasLimit = BigInt(10000000000000000000000000000000000000000000000000000000000)
      break;
    case 17:
      //Expect: status = 0
        ret.maxPriorityFeePerGas = -1
      break;
    case 18:
      //Expect: status = 0
        ret.maxPriorityFeePerGas = BigInt(10000000000000000000000000000000000000000000000000000000000)
      break;
    case 19:
      //Expect: status = 0
        ret.maxFeePerGas = -1
      break;
    case 20:
      //Expect: status = 0
        ret.maxFeePerGas = BigInt(10000000000000000000000000000000000000000000000000000000000)
      break;
    // case 21:
    //   //Expect: status = 0
    //     ret.gasFeeCap = -1
    //   break;
    // case 22:
    //   //Expect: status = 0
    //     ret.gasFeeCap = BigInt(10000000000000000000000000000000000000000000000000000000000)
    //   break;
    case 23:
      //Expect: status = 0
        ret.value = -1
      break;
    case 24:
      //Expect: status = 0
        ret.value = BigInt(10000000000000000000000)
      break;
    case 25:
      //Expect: status = 0
        ret.nonce = -1
      break;
    case 26:
      //Expect: status = 0
        ret.nonce = 0
      break;
    case 27:
      //Expect: status = 0
        ret.nonce = 10000000
      break;
    case 28:
      //Expect: status = 0
        ret.to = 10000000
      break;
    case 29:
      //Expect: status = 0
        ret.to = nil
      break;
    case 30:
      //Expect: status = 0
        ret.to = -2039
      break;
    case 31:
      //Expect: status = 0
        ret.to = "0x1902f834dfb6ec9421783e6333ed99fac9430dc2" 
      break;
    case 32:
      //Expect: status = 0
        ret.to = "0x1902f834dfb6ec9421783e6333ed99fac9430dc" 
      break;
    case 33:
      //Expect: status = 0
        ret.to = "0x111902f834dfb6ec9421783e6333ed99fac9430dc" 
      break;
    case 34:
      //Expect: status = 0
        ret.type = 2
        ret.to = getRandomExternalAddress()
        ret.externalGasLimit = -10
      break;
    case 35:
      //Expect: status = 0
        ret.type = 2
        ret.to = getRandomExternalAddress()
        ret.externalGasLimit = BigInt(100000000000000000000000000000000000)
      break;
    case 36:
      //Expect: status = 0
        ret.type = 2
        ret.to = getRandomExternalAddress()
        ret.externalGasPrice = -10
      break;
    case 37:
      //Expect: status = 0
        ret.type = 2
        ret.to = getRandomExternalAddress()
        ret.externalGasPrice = BigInt(100000000000000000000000000000000000)
      break;
    case 38:
      //Expect: status = 0
        ret.type = 2
        ret.to = getRandomExternalAddress()
        ret.externalGasTip = -10
      break;
    case 39:
      //Expect: status = 0
        ret.type = 2
        ret.to = getRandomExternalAddress()
        ret.externalGasTip = BigInt(100000000000000000000000000000000000)
      break;
    case 40:
      //Expect: status = 0
        ret.type = 2
        ret.to = getRandomExternalAddress()
        ret.data = BigInt(100000000000000000000000000000000000)
      break;
    case 41:
      //Expect: status = 1
        ret.type = 2
        ret.to = getRandomExternalAddress()
        ret.data = ""
      break;
    case 42:
      //Expect: status = 0
        ret.type = 2
        ret.to = getRandomExternalAddress()
        ret.data = -1
      break;
    case 43:
      //Expect: status = 0
        ret.type = 2
        ret.to = getRandomExternalAddress()
        ret.externalAccessList = -1
      break;
    default:
      break;
  }

  return ret
}

function loadLogger (config) {
  const log = require('./logger')(config?.log.winston.opts.level)
  info = log.info
  warn = log.warn
  error = log.error
  debug = log.debug
}

async function updateFeeData(provider) {
    try {
        const newFeeData = await provider.getFeeData()
        if (newFeeData.maxFeePerGas && ( !feeData?.maxFeePerGas || newFeeData.maxFeePerGas > feeData.maxFeePerGas))
            feeData.maxFeePerGas = newFeeData.maxFeePerGas

        if (newFeeData.maxPriorityFeePerGas && (!feeData?.maxPriorityFeePerGas || newFeeData.maxPriorityFeePerGas  > feeData.maxPriorityFeePerGas))
            feeData.maxPriorityFeePerGas = newFeeData.maxPriorityFeePerGas
    } catch (e)  {
        error("There was an error getting fee data", e)
        feeData.maxFeePerGas = 3000000000n
        feeData.maxPriorityFeePerGas = 1000000000n
    }
}


async function transact ({ wallet, nonce } = {}, double = false) {
    nonce = await provider.getTransactionCount(wallet.address, 'pending')
    const raw = await genRawTransaction(nonce, double)
    await wallet.sendTransaction(raw)
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

  if (config?.dumpConfig) info('loaded', { config: JSON.stringify(config, null, 2) })

  const wallets = await Promise.map(walletUsed, async (wallet) => {
    return ({
      wallet: new Wallet(wallet.privateKey, provider),
      nonce: await provider.getTransactionCount(wallet.address, 'pending')
    })
  })

  async function startTransaction (wallet, errorMessage) {
    const start = Date.now()
    let double = false
    try {
      if (['transaction underpriced', 'replacement transaction underpriced', 'nonce too low', 'frozen'].some(it => errorMessage?.includes(it))) {
        const was = wallet.nonce
        wallet.nonce = await provider.getTransactionCount(wallet.wallet.address, 'pending')
        warn('wallet nonce reset', { address: wallet.wallet.address, nonce: wallet.nonce, was })
        if (wallet.nonce <= was) {
          error('got same problematic nonce again', { address: wallet.wallet.address, nonce: wallet.nonce, was })
          // wallet.nonce = was + 1
        }
        double = true
      }
      errorMessage = undefined
      await transact(wallet, double)
      wallet.nonce++
    } catch (e) {
      error('error sending transaction', e?.error || e)
      errorMessage = e.error?.message || e.message
      if (['transaction underpriced', 'intrinsic gas too low'].some(it => errorMessage?.includes(it))) {
        await updateFeeData(provider)
        freezeCount++
        if (!freeze && freezeCount >= 10) {
          freeze = true
          setTimeout(async () => { freeze = false }, blockTime * 3)
        }
      }
    }
    setTimeout(() => startTransaction(wallet, errorMessage), interval * wallets.length - (Date.now() - start))
  }

  const start = Date.now()
  latest = start

  if (config?.txs.tps.check.enabled) {
    setInterval(async () => {
      // tps = (tps + (transactions / ((Date.now() - latest) / 1000))) / 2
      tps = transactions / ((Date.now() - latest) / 1000)
      transactions = 0
      latest = Date.now()
      info('tps check', { tps, interval, targetTps: targetTps / machinesRunning / numSlices })

      // interval = interval - interval * Kp * (targetTps / machinesRunning / numSlices - tps)
      if (interval < 0) interval = 0
    }, config?.txs.tps.check.interval)
  }

  if (config?.feeData.check.enabled) {
    setInterval(async () => {
      await updateFeeData(provider)
    }, config?.feeData.check.interval)
  }

  setInterval(async () => {
    freezeCount = 0
  }, blockTime)

  if (config?.txs.tps.increment.enabled) {
    setInterval(async () => {
      oldTps = targetTps
      targetTps += config?.txs.tps.increment.amount
      interval = oldTps / targetTps * interval
    }, config?.txs.tps.increment.interval)
  }
  for (let i = 0; i < count; i++) {
    startTransaction(wallets[i])
    await sleep(interval)
  }
})()
