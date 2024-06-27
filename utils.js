const { post } = require('axios')
const crypto = require('crypto')
const Promise = require('bluebird')
const nodeData = {
  'zone-0-0': {
    http: 9200,
    ws: 8200,
  },
  'zone-0-1': {
    http: 9201,
    ws: 8201,
  },
  'zone-0-2': {
    http: 9202,
    ws: 8202,
  },
  'zone-1-0': {
    http: 9220,
    ws: 8220,
  },
  'zone-1-1': {
    http: 9221,
    ws: 8221,
  },
  'zone-1-2': {
    http: 9222,
    ws: 8222
  },
  'zone-2-0': {
    http: 9240,
    ws: 8240
  },
  'zone-2-1': {
    http: 9241,
    ws: 8241
  },
  'zone-2-2': {
   http: 9242,
    ws: 8242
  }
}

const QUAI_CONTEXTS = [
  {
    name: 'Cyprus One',
    shard: 'zone-0-0',
    context: 2,
    byte: ['0x00']
  },
  {
    name: 'Cyprus Two',
    shard: 'zone-0-1',
    context: 2,
    byte: ['0x01']
  },
  {
    name: 'Cyprus Three',
    shard: 'zone-0-2',
    context: 2,
    byte: ['0x02']
  },
  {
    name: 'Paxos One',
    shard: 'zone-1-0',
    context: 2,
    byte: ['0x10']
  },
  {
    name: 'Paxos Two',
    shard: 'zone-1-1',
    context: 2,
    byte: ['0x11']
  },
  {
    name: 'Paxos Three',
    shard: 'zone-1-2',
    context: 2,
    byte: ['0x12']
  },
  {
    name: 'Hydra One',
    shard: 'zone-2-0',
    context: 2,
    byte: ['0x20']
  },
  {
    name: 'Hydra Two',
    shard: 'zone-2-1',
    context: 2,
    byte: ['0x21']
  },
  {
    name: 'Hydra Three',
    shard: 'zone-2-2',
    context: 2,
    byte: ['0x22']
  }
]

const networks = {
  1337: 'default',
  9000: 'colosseum',
  12000: 'garden',
  15000: 'orchard',
  17000: 'lighthouse'
}
async function lookupChainId (url) {
  const result = await post(url, {
    jsonrpc: '2.0',
    method: 'quai_chainId',
    id: 1
  })
  if (result.data?.error) {
    throw new Error(result.data.error)
  }

  const chainId = Number(result.data?.result)

  return chainId
}

async function lookupTxPending (url) {
  const result = await post(url, {
    jsonrpc: '2.0',
    method: 'txpool_status',
    id: 1
  })
  if (result.data?.error) {
    throw new Error(result.data?.error)
  }
  const { pending, queued } = result.data.result

  return { pending: Number(pending), queued: Number(queued) }
}
function generateRandomAddress () {
  return `0x${crypto.randomBytes(20).toString('hex')}`
}

function generateRandomAddressInShard (shard) {
  const start = Number(shard.byte[0])
  const end = Number(shard.byte[1])
  let prefix = Math.floor(Math.random() * (end - start + 1) + start).toString(16)
  // if prefix is only 1 character, add a 0 to the front
  if (prefix.length === 1) {
    prefix = '0' + prefix
  }
  let randomAddress = generateRandomAddress()
  // replace first 4 characters with random number between start and end
  randomAddress = randomAddress.replace(
    randomAddress.substring(2, 4),
    prefix
  )
  return randomAddress
}

function sleep (s) {
  return new Promise((resolve) => setTimeout(resolve, s))
}

module.exports = {
  generateRandomAddressInShard,
  lookupChainId,
  lookupTxPending,
  nodeData,
  networks,
  sleep,
  QUAI_CONTEXTS
}
