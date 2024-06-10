'use strict'

module.exports = {
  env: 'colosseum',
  blockTime: 12 * 1000, // 10s
  machinesRunning: 1,
  txs: {
    tps: {
      target: 100,
      increment: {
        enabled: false,
	amount: 10,
	interval: 300 * 1000, // 5min
      }
    },
    etxFreq: 0
  },
  memPool: {
    max: 12000,
  }
}
