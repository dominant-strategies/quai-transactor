'use strict'

module.exports = {
  env: 'garden',
  blockTime: 10 * 1000, // 10s
  txs: {
    tps: {
      walletEnd: 105,
      increment: {
        enabled: false
      },
      etxFreq: 0.1
    }
  }
}
