'use strict'

const path = require('path')
const pkg = require(path.join(__dirname, '..', 'package.json'))

module.exports = {
  env: 'default',
  dumpConfig: true,
  blockTime: 2 * 1000, // 2s
  machinesRunning: 1,
  numSlices: 1,
  log: {
    winston: {
      opts: {
        name: pkg.name,
        version: pkg.version,
        level: 'debug'
      }
    }
  },
  txs: {
    tps: {
      target: 111,
      increment: {
        enabled: true,
        amount: 200,
        interval: 1000 * 60 * 60 * 1 // 1hr
      },
      check: {
        enabled: true,
        interval: 1000 * 10 // 3s 
      }
    },
    etxFreq: 0,
    loValue: 1,
    hiValue: 100,
    absoluteRandomAddressRatio: 0
  },
  memPool: {
    max: 12000,
    check: {
      enabled: true,
      interval: 1000 * 3 // 3s
    }
  },
  feeData: {
    check: {
      enabled: true,
      interval: 1000 * 3 // 3s
    }
  }
}
