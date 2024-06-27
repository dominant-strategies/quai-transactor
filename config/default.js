'use strict'

const path = require('path')
const pkg = require(path.join(__dirname, '..', 'package.json'))

module.exports = {
  env: 'default',
  dumpConfig: true,
  blockTime: 2 * 1000, // 2s
  machinesRunning: 3,
  numSlices: 1,
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
      target: 50,
      increment: {
        enabled: true,
        amount: 10,
        interval: 1000 * 60 * 60 * 3 // 1hr
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
    max: 4096,
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
