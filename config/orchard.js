'use strict'

module.exports = {
  env: 'orchard',
  blockTime: 12 * 1000, // 10s
  txs: {
    tps: {
      walletEnd: 148,
      increment: {
        amount: 54,
        interval: 1000 * 60 * 60 * 4 // 6hr
      },
    }
  }
}
