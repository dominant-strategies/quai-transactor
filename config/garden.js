'use strict'

module.exports = {
  env: 'garden',
  blockTime: 10 * 1000, // 10s
  machinesRunning: 4,
  txs: {
    tps: {
      target: 400,
      increment: {
        enabled: false
      },
      etxFreq: 0.1
    }
  }
}
