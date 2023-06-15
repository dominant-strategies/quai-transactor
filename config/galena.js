'use strict'

module.exports = {
  env: 'galena',
  blockTime: 12 * 1000, // 12s
  machinesRunning: 6,
  txs: {
    tps: {
      target: 100,
      increment: {
        enabled: false
      },
      etxFreq: 0.1
    }
  }
}
