'use strict'

const path = require('path')
const pkg = require(path.join(__dirname, '..', 'package.json'))

module.exports = {
  env: 'garden',
  dumpConfig: true,
  blockTime: 10 * 1000, // 2s
  machinesRunning: 6,
  numSlices: 9,
  log: {
    winston: {
      opts: {
        name: pkg.name,
        version: pkg.version,
        level: 'info'
      }
    }
  },
  txs: {
    tps: {
      target: 500,
      increment: {
        enabled: false,
        amount: 100,
        interval: 5000 * 60 * 10 // 30 mins
      },
      check: {
        enabled: true,
        interval: 1000 * 3 // 3s
      }
    },
    etxFreq: 0.1,
    convFreq: 0.1,
    loValue: 1,
    hiValue: 100,
    absoluteRandomAddressRatio: 0
  },
  memPool: {
    max: 20000,
    check: {
      enabled: true,
      interval: 1000 * 3 // 3s
    }
  },
  feeData: {
    check: {
      enabled: true,
      interval: 1000 * 1 // 3s
    }
  }
}
