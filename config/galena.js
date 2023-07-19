'use strict'

module.exports = {
  env: 'galena',
  blockTime: 7 * 1000, // 7s
  machinesRunning: 6,
  txs: {
    tps: {
      target: 2000,
      increment: {
        enabled: false
      }
    },
  },
  memPool: {
    max: 12000
  }
}
