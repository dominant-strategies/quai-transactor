const Promise = require('bluebird')
const {JsonRpcProvider, Wallet} = require('quais')
const walletsJson = require('./wallets.json')
const {post} = require('axios')

const nodeData = {
    "zone-0-0": {
        http: 8610,
        ws: 8611,
    },
    "zone-0-1": {
        http: 8542,
        ws: 8643,
    },
    "zone-0-2": {
        http: 8674,
        ws: 8675,
    },
    "zone-1-0": {
        http: 8512,
        ws: 8613,
    },
    "zone-1-1": {
        http: 8544,
        ws: 8645,
    },
    "zone-1-2": {
        http: 8576,
        ws: 8677,
    },
    "zone-2-0": {
        http: 8614,
        ws: 8615,
    },
    "zone-2-1": {
        http: 8646,
        ws: 8647,
    },
    "zone-2-2": {
        http: 8678,
        ws: 8679,
    }
}

const host = 'localhost'
const selectedGroup = 'group-0'
const selectedZone = 'zone-0-0'
const protocol = 'http'
const providerUrl = `${protocol}://${host}:${nodeData[selectedZone][protocol]}`
const loValue = 1
const hiValue = 100

const chainId = 1337
const etxFreq = .2
const provider = new JsonRpcProvider(providerUrl) // using let so it is globally scoped

async function sendRawTransaction(url, signedHexValue) {
    try {
        const result = await post(url, {
            jsonrpc: "2.0",
            method: "quai_sendRawTransaction",
            params: [signedHexValue],
            id: 1,
        });
        if (result.data.error) {
            console.log("Error: ", result.data.error.message);
        }
    } catch (error) {
        console.log("Error: ", error.message)
    }
}

async function genRawTransaction(wallet) {
    const nonce = await provider.getTransactionCount(wallet.address, 'pending')
    const feeData = await provider.getFeeData()
    const value = Math.floor(Math.random() * (hiValue - loValue + 1) + loValue);
    const isExternal = Math.random() > etxFreq

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
        maxFeePerGas: feeData.maxPriorityFeePerGas * BigInt(2),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        type,
        chainId,
    }
    if (isExternal) { // is external this time
        ret.externalGasLimit = BigInt(100000)
        ret.externalGasPrice = BigInt(
            Number(feeData.maxFeePerGas) * 2
        )
        ret.externalGasTip = BigInt(
            Number(feeData.maxPriorityFeePerGas) * 2
        )
    }
    return ret
}

function sleep(s) {
    return new Promise((resolve) => setTimeout(resolve, s));
}
// Generate a random Ethereum address
function generateRandomAddress() {
    const hexChars = '0123456789abcdef';
    let address = '0x';

    // Generate 40 random hexadecimal characters
    for (let i = 0; i < 40; i++) {
        const randomIndex = Math.floor(Math.random() * 16);
        address += hexChars[randomIndex];
    }

    return address;
}

function getRandomAddressInShard(shard) {
    const start = Number(shard.byte[0])
    const end = Number(shard.byte[1])
    let prefix =  Math.floor(Math.random() * (end - start + 1) + start).toString(16)
    // if prefix is only 1 character, add a 0 to the front
    if (prefix.length === 1) {
        prefix = "0" + prefix
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
        name: "Cyprus One",
        shard: "zone-0-0",
        context: 2,
        byte: ["0x00", "0x1D"]
    },
    {
        name: "Cyprus Two",
        shard: "zone-0-1",
        context: 2,
        byte: ["0x1E", "0x3A"]
    },
    {
        name: "Cyprus Three",
        shard: "zone-0-2",
        context: 2,
        byte: ["0x3B", "0x57"]
    },
    {
        name: "Paxos One",
        shard: "zone-1-0",
        context: 2,
        byte: ["0x58", "0x73"]
    },
    {
        name: "Paxos Two",
        shard: "zone-1-1",
        context: 2,
        byte: ["0x74", "0x8F"]
    },
    {
        name: "Paxos Three",
        shard: "zone-1-2",
        context: 2,
        byte: ["0x90", "0xAB"]
    },
    {
        name: "Hydra One",
        shard: "zone-2-0",
        context: 2,
        byte: ["0xAC", "0xC7"]
    },
    {
        name: "Hydra Two",
        shard: "zone-2-1",
        context: 2,
        byte: ["0xC8", "0xE3"]
    },
    {
        name: "Hydra Three",
        shard: "zone-2-2",
        context: 2,
        byte: ["0xE4", "0xFF"]
    }
];

const externalShards = QUAI_CONTEXTS.filter((shard) => shard.shard !== selectedZone)
const selectedShard = QUAI_CONTEXTS.find((shard) => shard.shard === selectedZone)

async function transact(wallet) {
    while (true) {
        const raw = await genRawTransaction(wallet)
        const signed = await wallet.signTransaction(raw)
        await sendRawTransaction(providerUrl, signed)
        await sleep(1000)
    }
}

;(async () => {
    const wallets = walletsJson[selectedGroup][selectedZone].map((wallet) => new Wallet(wallet.privateKey, provider))

    const start = Date.now()
    await Promise.map(wallets, async (wallet) => transact(wallet))
})()
