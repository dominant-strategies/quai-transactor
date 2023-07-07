'use strict'

module.exports = {
  env: 'garden',
  blockTime: 3 * 1000, // 3s
  machinesRunning: 4,
  txs: {
    tps: {
      target: 500,
      increment: {
        enabled: false,
      },
      etxRatio: .1,
    }
  }
}
