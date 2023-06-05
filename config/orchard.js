'use strict'

module.exports = {
  env: 'orchard',
  blockTime: 10 * 1000, // 10s
  txs: {
    tps: {
      walletEnd: 92,
      increment: {
        amount: 37,
        interval: 1000 * 60 * 60 * 4 // 6hr
      },
    }
  }
}
