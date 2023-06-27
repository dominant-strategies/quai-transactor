'use strict'

module.exports = {
  env: 'colosseum',
  blockTime: 12 * 1000, // 10s
  machinesRunning: 3,
  txs: {
    tps: {
      target: 200,
      increment: {
        enabled: false,
      },
    },
    etxFreq: .2,
  },
}
