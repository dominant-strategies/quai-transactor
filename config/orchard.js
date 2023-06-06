'use strict'

module.exports = {
  env: 'orchard',
  blockTime: 10 * 1000, // 10s
  txs: {
    tps: {
      walletEnd: 240,
      increment: {
        amount: 74,
        interval: 1000 * 60 * 60 * 4 // 6hr
      },
    }
  }
}
