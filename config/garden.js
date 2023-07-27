'use strict'

module.exports = {
  env: 'garden',
  blockTime: 3 * 1000, // 3s
  machinesRunning: 6,
  txs: {
    tps: {
      target: 1000,
      increment: {
        enabled: false
      },
      etxFreq: 0.1
    }
  }
}
