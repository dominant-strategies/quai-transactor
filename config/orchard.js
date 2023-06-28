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
      target: 200,
      increment: {
        amount: 250,
        interval: 1000 * 60 * 60 * 3 // 1hr
      }
    },
  },
  memPool: {
    max: 20000
  }
}
