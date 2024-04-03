import { updateSafeTransaction } from 'legacy/state/enhancedTransactions/actions'
import { EnhancedTransactionDetails } from 'legacy/state/enhancedTransactions/reducer'

import { finalizeEthereumTransaction } from './finalizeEthereumTransaction'
import { handleTransactionReplacement } from './handleTransactionReplacement'

import { CheckEthereumTransactions } from '../types'

export function checkSafeTransaction(transaction: EnhancedTransactionDetails, params: CheckEthereumTransactions) {
  const { chainId, getTxSafeInfo, dispatch, safeInfo, getReceipt, lastBlockNumber } = params
  const { hash, receipt } = transaction
  // Get safe info and receipt
  const { promise: safeTransactionPromise, cancel } = getTxSafeInfo(hash)

  // Get safe info
  safeTransactionPromise
    .then(async (safeTransaction) => {
      const { isExecuted, transactionHash } = safeTransaction
      const safeNonce = safeInfo?.nonce

      if (typeof safeNonce === 'number' && safeNonce > safeTransaction.nonce && !isExecuted) {
        handleTransactionReplacement(transaction, params)

        return
      }

      // If the safe transaction is executed, but we don't have a tx receipt yet
      if (isExecuted && !receipt) {
        // Get the ethereum tx receipt
        console.log(
          '[FinalizeTxUpdater] Safe transaction is executed, but we have not fetched the receipt yet. Tx: ',
          transactionHash
        )
        // Get the transaction receipt
        const { promise: receiptPromise } = getReceipt(transactionHash)

        receiptPromise
          .then((newReceipt) => finalizeEthereumTransaction(newReceipt, transaction, params, hash))
          .catch((error) => {
            if (!error.isCancelledError) {
              console.error(`[FinalizeTxUpdater] Failed to get transaction receipt for safeTransaction: ${hash}`, error)
            }
          })
      }

      dispatch(updateSafeTransaction({ chainId, safeTransaction, blockNumber: lastBlockNumber }))
    })
    .catch((error) => {
      if (!error.isCancelledError) {
        console.error(`[FinalizeTxUpdater] Failed to check transaction hash: ${hash}`, error)
      }
    })

  return cancel
}
