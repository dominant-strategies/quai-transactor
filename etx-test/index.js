const walletsJson = require('./wallets.json')
const { post } = require('axios')
const Promise = require('bluebird')

const host = 'localhost'

async function getBalance (url, address, number = 'latest') {
  try {
   const result = await post(url, {
     jsonrpc: '2.0',
     method: 'quai_getBalance',
     params: [address, number],
     id: 1
   })
  if (result.data?.error) {
    throw new Error(result.data.error)
  }

  const balance = result.data?.result
  return parseInt(balance, 16)
  } catch (e) {
     console.log("error")
    console.log(JSON.stringify(e, null, 2))
    return await getBalance(url, address, number)
  }
}

async function blockNumber (url) {
  const result = await post(url, {
    jsonrpc: '2.0',
    method: 'quai_blockNumber',
    params: [],
    id: 1
  })
  if (result.data?.error) {
    throw new Error(result.data.error)
  }

  const hex = result.data?.result

  return parseInt(hex, 16)
}

async function getBlockByNumber (url, address) {
  const result = await post(url, {
    jsonrpc: '2.0',
    method: 'quai_getBlockByNumber',
    params: [`0x${address.toString(16)}`, true],
    id: 1
  })
  if (result.data?.error) {
    throw new Error(result.data.error)
  }

  const block = result.data?.result

  return block
}

const nodeData = {
  'zone-0-0': {
    http: 8610,
    ws: 8611
  },
  'zone-0-1': {
    http: 8542,
    ws: 8643
  },
  'zone-0-2': {
    http: 8674,
    ws: 8675
  },
  'zone-1-0': {
    http: 8512,
    ws: 8613
  },
  'zone-1-1': {
    http: 8544,
    ws: 8645
  },
  'zone-1-2': {
    http: 8576,
    ws: 8677
  },
  'zone-2-0': {
    http: 8614,
    ws: 8615
  },
  'zone-2-1': {
    http: 8646,
    ws: 8647
  },
  'zone-2-2': {
    http: 8678,
    ws: 8679
  }
}

const QUAI_CONTEXTS = [
  {
    name: 'Cyprus One',
    shard: 'zone-0-0',
    context: 2,
    byte: ['0x00', '0x1D']
  },
  {
    name: 'Cyprus Two',
    shard: 'zone-0-1',
    context: 2,
    byte: ['0x1E', '0x3A']
  },
  {
    name: 'Cyprus Three',
    shard: 'zone-0-2',
    context: 2,
    byte: ['0x3B', '0x57']
  },
  {
    name: 'Paxos One',
    shard: 'zone-1-0',
    context: 2,
    byte: ['0x58', '0x73']
  },
  {
    name: 'Paxos Two',
    shard: 'zone-1-1',
    context: 2,
    byte: ['0x74', '0x8F']
  },
  {
    name: 'Paxos Three',
    shard: 'zone-1-2',
    context: 2,
    byte: ['0x90', '0xAB']
  },
  {
    name: 'Hydra One',
    shard: 'zone-2-0',
    context: 2,
    byte: ['0xAC', '0xC7']
  },
  {
    name: 'Hydra Two',
    shard: 'zone-2-1',
    context: 2,
    byte: ['0xC8', '0xE3']
  },
  {
    name: 'Hydra Three',
    shard: 'zone-2-2',
    context: 2,
    byte: ['0xE4', '0xFF']
  }
]

const networks = {
  1337: 'default',
  9000: 'colosseum',
  12000: 'garden',
  15000: 'orchard',
  17000: 'galena'
}

;(async () => {
  const numberOfGroups = 1

  const wallets = {}
  Object.keys(nodeData).forEach(zone => {
    wallets[zone] = []
  })

  for (let i = 0; i < numberOfGroups; i++) {
    for (const zone of Object.keys(nodeData)) {
      wallets[zone] = [...wallets[zone], ...walletsJson[`group-${i}`][zone]]
    }
  }

  const start = (await Promise.map(Object.keys(nodeData), async zone => {
    const port = nodeData[zone].http

    return await Promise.map(wallets[zone], async (wallet, i) => {
      const balance = await getBalance(`http://${host}:${port}`, wallet.address, '0x1')
      return balance
    }).reduce((accum, next) => accum + next, 0)
  }).reduce((accum, next) => accum + next, 0))
  console.log('start', start)

  // for every zone
  const gasUsed = await Promise.map(Object.keys(nodeData), async zone => {
    const port = nodeData[zone].http
    const number = await blockNumber(`http://${host}:${port}`)

    const arr = new Array(number)


    // for every block in that zone
    return await Promise.map(arr, async (wallet, i) => {
      const block = await getBlockByNumber(`http://${host}:${port}`, i)
      const txs = block.transactions
      if (txs.length !== 0) console.log(zone, block, txs.filter(it => it.type !== '0x1').length)


      // filter type 0 and type 2 and aggregate as follows
      // type 0: originFee * gas
      // type 1: already paid; dont do anything
      // type 2: originFee * gas + destinationFee * destinationGas
      return txs.filter(it => it.type !== '0x1').map(it => parseInt(it.gas, 16) * (parseInt(it.maxPriorityFeePerGas, 16)+parseInt(block.baseFeePerGas,16))).reduce((accum, next) => accum + next, 0) 
		    + txs.filter(it => it.type === '0x2').map(it => parseInt(it.etxGasLimit, 16) * (parseInt(it.etxGasTip, 16)+parseInt(it.etxGasPrice, 16))).reduce((accum, next) => accum + next, 0)
    }).reduce((accum, next) => accum + Number(next), 0)
  }).reduce((accum, next) => accum + Number(next), 0)

  console.log('gasUsed', gasUsed)

  const end = (await Promise.map(Object.keys(nodeData), async zone => {
    const port = nodeData[zone].http

    return await Promise.map(wallets[zone], async (wallet, i) => {
      const balance = await getBalance(`http://${host}:${port}`, wallet.address)
      return balance
    }).reduce((accum, next) => accum + next, 0)
  }).reduce((accum, next) => accum + next, 0))
  console.log('end', end)
  console.log(start === end + gasUsed)
  console.log("start - end: ",start - end)
  console.log('result: ', start - (end + gasUsed))
})()
