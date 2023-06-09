'use strict'

module.exports = {
  env: 'orchard',
  blockTime: 2 * 12 * 1000, // 12s
  machinesRunning: 6,
  txs: {
    tps: {
      target: 1000,
      increment: {
	enabled: false,
        amount: 300,
        interval: 1000 * 60 * 60 * 4 // 6hr
      }
    }
  },
  memPool: {
    max: 2 * 4096
  }
}
