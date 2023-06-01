'use strict'

module.exports = {
  env: 'garden',
  blockTime: 10 * 1000, // 10s
  txs: {
    tps: {
      walletEnd: 250,
      increment: {
        enabled: false
      }
    }
  }
}
