'use strict'

module.exports = {
  env: 'colosseum',
  blockTime: 12 * 1000, // 10s
  machinesRunning: 4,
  txs: {
    tps: {
      target: 20,
      increment: {
        enabled: false
      }
    },
    etxFreq: 0.1
  },
  memPool: {
    max: 1000,
  }
}
