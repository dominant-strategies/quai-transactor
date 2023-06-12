'use strict'

module.exports = {
  env: 'orchard',
  blockTime: 2 * 12 * 1000, // 12s
  machinesRunning: 6,
  log: {
    winston: {
      opts: {
        level: 'debug'
      }
    }
  },
  txs: {
    tps: {
      target: 1750,
      increment: {
        amount: 250,
        interval: 1000 * 60 * 60 * 1 // 1hr
      }
    }
  },
  memPool: {
    max: 12000
  }
}
