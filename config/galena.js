'use strict'

module.exports = {
  env: 'galena',
  blockTime: 12 * 1000, // 12s
  machinesRunning: 6,
  txs: {
    tps: {
      target: 2000,
      increment: {
        enabled: false
      }
    },
  }
}
