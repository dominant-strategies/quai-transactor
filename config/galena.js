'use strict'

module.exports = {
  env: 'galena',
  blockTime: 12 * 1000, // 12s
  machinesRunning: 6,
  txs: {
    tps: {
      target: 1000,
      increment: {
        enabled: false
      }
    },
    etxFreq: .1,
  },
  memPool: {
    max: 12000
  }
}
