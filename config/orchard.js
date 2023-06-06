'use strict'

module.exports = {
  env: 'orchard',
  blockTime: 2 * 12 * 1000, // 12s
  txs: {
    tps: {
      walletEnd: 340,
      increment: {
        amount: 54,
        interval: 1000 * 60 * 60 * 4 // 6hr
      }
    }
  },
  memPool: {
    max: 2 * 4096
  }
}
