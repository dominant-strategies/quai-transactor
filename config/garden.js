'use strict'

module.exports = {
  env: 'garden',
  blockTime: 10 * 1000, // 10s
  machinesRunning: 4,
  txs: {
    tps: {
      target: 1000,
      increment: {
        enabled: false,
      },
    }
    etxFreq: .1,
  }
}
