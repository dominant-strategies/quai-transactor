'use strict'

module.exports = {
  env: 'garden',
  blockTime: 7 * 1000, // 7s
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
