'use strict'

module.exports = {
  env: 'orchard',
  blockTime: 2 * 12 * 1000, // 12s
  machinesRunning: 4,
  log: {
    winston: {
      opts: {
        level: 'info'
      }
    }
  },
  txs: {
    tps: {
      target: 2000,
      increment: {
        enabled: false,
        amount: 250,
        interval: 1000 * 60 * 60 * 3 // 1hr
      }
    },
    etxFreq: 0
  },
  memPool: {
    max: 20000
  }
}
