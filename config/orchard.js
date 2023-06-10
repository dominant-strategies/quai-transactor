'use strict'

module.exports = {
  env: 'orchard',
  blockTime: 2 * 12 * 1000, // 12s
  machinesRunning: 6,
  log: {
    winston: {
      opts: {
        level: 'info'
      }
    }
  },
  txs: {
    tps: {
      target: 250,
      increment: {
        amount: 250,
        interval: 1000 * 60 * 60 * 4 // 4hr
      }
    }
  },
  memPool: {
    max: 2 * 4096
  }
}
