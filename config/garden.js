'use strict'

module.exports = {
  env: 'garden',
  blockTime: 7 * 1000, // 7s
  machinesRunning: 2,
  txs: {
    tps: {
      target: 2000,
      increment: {
        enabled: false
      }
    },
    etxFreq: 0.1,
  },
  memPool: {
    max: 12000
  }
}
