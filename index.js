const Promise = require('bluebird')
const {JsonRpcProvider, Wallet} = require('quais')
const walletsJson = require('./wallets.json')
const {post} = require('axios')
const crypto = require('crypto')

const winston = require('winston')

const customFormat = winston.format.printf(({level, message, timestamp, ...metadata}) => {
    let msg = `${level.toUpperCase()} [${formatDate(new Date(timestamp))}] ${message} `
    for (const key in metadata) {
        msg += `${key}:= ${metadata[key]} `
    }
    return msg
})

function formatDate(date) {
    const pad = (num) => num.toString().padStart(2, '0')
    const padMilliseconds = (num) => num.toString().padStart(3, '0')

    const day = pad(date.getDate())
    const month = pad(date.getMonth() + 1)
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const seconds = pad(date.getSeconds())
    const milliseconds = padMilliseconds(date.getMilliseconds())

    return `${month}-${day}|${hours}:${minutes}:${seconds}.${milliseconds}`
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        customFormat
    ),
    transports: [
        new winston.transports.Console()
    ]
})

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

let memPoolSize;
let transactions = 0
let latest
let interval = 4000
let desiredTps = 40 / 6
let feeData

async function sendRawTransaction(url, signedHexValue) {
    try {
        transactions++
        const result = await post(url, {
            jsonrpc: '2.0',
            method: 'quai_sendRawTransaction',
            params: [signedHexValue],
            id: 1
        })
        if (result.data.error) {
            logger.error('Error1: ', result.data.error)
        }
    } catch (error) {
        logger.error('Error2: ', error.message)
    }
}

async function lookupTxPending(url) {
    try {
        const result = await post(url, {
            jsonrpc: '2.0',
            method: 'txpool_status',
            id: 1
        })
        if (result.data.error) {
            logger.error('lookupTxPending Error1: ', result.data.error)
        }
        const resPend = result.data.result.pending
        const resQueued = result.data.result.queued
        return [Number(resPend), Number(resQueued)]
    } catch (error) {
        logger.error('lookupTxPending Error2: ', error)
    }
}

async function genRawTransaction(wallet, nonce) {
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

function sleep(s) {
    return new Promise((resolve) => setTimeout(resolve, s))
}
function generateRandomAddress() {
    return `0x${crypto.randomBytes(20).toString('hex')}`
}

function getRandomAddressInShard(shard) {
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

function getRandomExternalAddress() {
    return getRandomAddressInShard(externalShards[Math.floor(Math.random() * externalShards.length)])
}

function getRandomInternalAddress() {
    return getRandomAddressInShard(selectedShard)
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

const externalShards = QUAI_CONTEXTS.filter((shard) => shard.shard !== selectedZone)
const selectedShard = QUAI_CONTEXTS.find((shard) => shard.shard === selectedZone)

async function transact(wallet) {
    let nonce = await provider.getTransactionCount(wallet.address, 'pending')
    while (true) {
        const raw = await genRawTransaction(wallet, nonce)
        const signed = await wallet.signTransaction(raw)
        if (memPoolSize < memPoolMax) await sendRawTransaction(providerUrl, signed)
        await sleep(interval)
        if (nonce % 100 === 0) {
            nonce = await provider.getTransactionCount(wallet.address, 'pending')
        } else {
            nonce++
        }
    }
}

;(async () => {
    logger.info('Starting QUAI load test', selectedShard.shard, selectedGroup)

    const wallets = walletsJson[selectedGroup][selectedZone].map((wallet) => new Wallet(wallet.privateKey, provider))
    memPoolSize = Math.max(...(await lookupTxPending(providerUrl)))
    feeData = await provider.getFeeData()

    const start = Date.now()
    latest = start

    setInterval(async () => {
        memPoolSize = Math.max(...(await lookupTxPending(providerUrl)))
        if (memPoolSize > memPoolMax) logger.warn('mempool full')
    }, 1000 * 3)

    setInterval(async () => {
        const tps = transactions / ((Date.now() - latest) / 1000);
        transactions = 0;
        latest = Date.now();
        if (tps < desiredTps) {
            interval -= 10 // should be based on desiredTps - tps
        } else {
            interval += 10
        }
        logger.info(`tps: ${tps}, desiredTps: ${desiredTps}, interval: ${interval}`);
    }, 1000 * 30);

    setInterval(async () => {
        feeData = await provider.getFeeData()
    },  1000 * 30)

    setInterval(async () => {
        desiredTps += 3.33
        if (desiredTps > 50) desiredTps = 50
    }, 1000 * 60 * 60 * 1)

    await Promise.map(wallets, async (wallet) => transact(wallet))
})()
