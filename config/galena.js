'use strict'

module.exports = {
  env: 'galena',
  blockTime: 12 * 1000, // 12s
  txs: {
    tps: {
      walletEnd: 100,
      increment: {
        amount: 44,
        interval: 1000 * 60 * 60 * 2 // 2hr
      }
    },
    etxFreq: 0.1
  }
}
