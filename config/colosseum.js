'use strict'

module.exports = {
  env: 'colosseum',
  blockTime: 12 * 1000, // 10s
  machinesRunning: 6,
  txs: {
    tps: {
      target: 20,
      increment: {
        enabled: true,
	amount: 10,
	interval: 300 * 1000, // 5min
      }
    },
    etxFreq: 0
  },
  memPool: {
    max: 7500,
  }
}
