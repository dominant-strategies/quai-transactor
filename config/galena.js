'use strict'

module.exports = {
  env: 'galena',
  blockTime: 12 * 1000, // 12s
  machinesRunning: 4,
  txs: {
    tps: {
      target: 300,
      increment: {
        enabled: false,
        amount: 100,
        interval: 1000 * 60 * 60 * 2 // 2hr
      }
    }
  }
}
