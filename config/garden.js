'use strict'

module.exports = {
  env: 'garden',
  blockTime: 10 * 1000, // 10s
  txs: {
    tps: {
      walletEnd: 160,
      increment: {
        enabled: false
      }
    }
  }
}
