const { post } = require('axios')
const { error } = require('./logger')
const crypto = require('crypto')
const Promise = require('bluebird')
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

async function lookupTxPending (url) {
  try {
    const result = await post(url, {
      jsonrpc: '2.0',
      method: 'txpool_status',
      id: 1
    })
    if (result.data.error) {
      error('lookupTxPending Error1: ', result.data.error)
    }
    const resPend = result.data.result.pending
    const resQueued = result.data.result.queued
    return [Number(resPend), Number(resQueued)]
  } catch (e) {
    error('lookupTxPending Error2: ', e)
  }
}
async function sendRawTransaction (url, signedHexValue) {
  const result = await post(url, {
    jsonrpc: '2.0',
    method: 'quai_sendRawTransaction',
    params: [signedHexValue],
    id: 1
  })
  if (result.data?.error) throw new Error(result.data.error.message)
}

function generateRandomAddress () {
  return `0x${crypto.randomBytes(20).toString('hex')}`
}

function getRandomAddressInShard (shard) {
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
  getRandomAddressInShard,
  lookupTxPending,
  nodeData,
  sleep,
  sendRawTransaction,
  QUAI_CONTEXTS
}
