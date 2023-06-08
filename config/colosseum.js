'use strict'

module.exports = {
  env: 'colosseum',
  blockTime: 10 * 1000, // 10s
  txs: {
    tps: {
      increment: {
        interval: 1000 * 60 * 60 * 4 // 4hr
      }
    }
  }
}
