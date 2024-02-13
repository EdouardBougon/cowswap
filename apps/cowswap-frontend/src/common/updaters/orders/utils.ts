import { formatSymbol, formatTokenAmount, isSellOrder, shortenAddress } from '@cowprotocol/common-utils'
import { EnrichedOrder, SupportedChainId as ChainId } from '@cowprotocol/cow-sdk'

import { Order, OrderFulfillmentData, OrderStatus } from 'legacy/state/orders/actions'
import { classifyOrder, OrderTransitionStatus } from 'legacy/state/orders/utils'
import { stringToCurrency } from 'legacy/state/swap/extension'

import { getOrder } from 'api/gnosisProtocol'
import { getIsComposableCowChildOrder } from 'utils/orderUtils/getIsComposableCowChildOrder'

type OrderID = string

export type OrderLogPopupMixData = OrderFulfillmentData | OrderID

export function computeOrderSummary({
  orderFromStore,
  orderFromApi,
}: {
  orderFromStore?: Order
  orderFromApi: EnrichedOrder | null
}) {
  // Default to store's current order summary
  let summary: string | undefined = orderFromStore?.summary

  // if we can find the order from the API
  // and our specific order exists in our state, let's use that
  if (orderFromApi) {
    const {
      buyToken,
      sellToken,
      sellAmount,
      feeAmount,
      buyAmount,
      executedBuyAmount,
      executedSellAmount,
      owner,
      receiver,
    } = orderFromApi

    if (orderFromStore) {
      const { inputToken, outputToken, status, kind } = orderFromStore
      const isFulfilled = status === OrderStatus.FULFILLED

      if (!inputToken || !outputToken) return undefined

      // don't show amounts in atoms
      const inputAmount = isFulfilled
        ? stringToCurrency(executedSellAmount, inputToken)
        : // sellAmount doesn't include the fee, so we add it back to not show a different value when the order is traded
          stringToCurrency(sellAmount, inputToken).add(stringToCurrency(feeAmount, inputToken))
      const outputAmount = stringToCurrency(isFulfilled ? executedBuyAmount : buyAmount, outputToken)

      const isSell = isSellOrder(kind)

      const inputPrefix = !isFulfilled && !isSell ? 'at most ' : ''
      const outputPrefix = !isFulfilled && isSell ? 'at least ' : ''

      summary = `Swap ${inputPrefix}${formatTokenAmount(inputAmount)} ${formatSymbol(
        inputAmount.currency.symbol
      )} for ${outputPrefix}${formatTokenAmount(outputAmount)} ${formatSymbol(outputAmount.currency.symbol)}`
    } else {
      // We only have the API order info, let's at least use that
      summary = `Swap ${sellToken} for ${buyToken}`
    }

    if (owner && receiver && receiver !== owner) {
      summary += ` to ${shortenAddress(receiver)}`
    }
  } else {
    console.log(`[state:orders:updater] computeFulfilledSummary::API data not yet in sync with blockchain`)
  }

  return summary
}

type PopupData = {
  status: OrderTransitionStatus
  popupData?: OrderLogPopupMixData
}

export async function fetchOrderPopupData(orderFromStore: Order, chainId: ChainId): Promise<PopupData | null> {
  // Skip EthFlow creating orders
  if (orderFromStore.status === OrderStatus.CREATING) {
    return null
  }
  // Get order from API
  let orderFromApi: EnrichedOrder | null = null
  try {
    const isComposableCowChildOrder = getIsComposableCowChildOrder(orderFromStore)
    // For ComposableCow child orders always request PROD order-book
    orderFromApi = await getOrder(chainId, orderFromStore.id, isComposableCowChildOrder ? 'prod' : undefined)
  } catch (e: any) {
    console.debug(
      `[PendingOrdersUpdater] Failed to fetch order popup data on chain ${chainId} for order ${orderFromStore.id}`
    )
    return null
  }
  const status = classifyOrder(orderFromApi)

  let popupData = undefined

  switch (status) {
    case 'fulfilled':
      popupData = {
        id: orderFromStore.id,
        fulfillmentTime: new Date().toISOString(),
        transactionHash: '', // there's no need  for a txHash as we'll link the notification to the Explorer
        summary: computeOrderSummary({ orderFromStore, orderFromApi }),
        apiAdditionalInfo: orderFromApi
          ? {
              ...orderFromApi,
            }
          : undefined,
      }
      break
    case 'expired':
    case 'cancelled':
    case 'presigned':
      popupData = orderFromStore.id
      break
    default:
      // No popup for other states
      break
  }

  return { status, popupData }
}
