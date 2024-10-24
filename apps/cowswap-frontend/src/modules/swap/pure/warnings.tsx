import React from 'react'

import { genericPropsChecker } from '@cowprotocol/common-utils'
import { SupportedChainId } from '@cowprotocol/cow-sdk'
import { BundleTxApprovalBanner, BundleTxSafeWcBanner, BundleTxWrapBanner } from '@cowprotocol/ui'
import { Currency, CurrencyAmount, Percent } from '@uniswap/sdk-core'

import styled from 'styled-components/macro'

import { HighFeeWarning, HighSuggestedSlippageWarning } from 'legacy/components/SwapWarnings'
import TradeGp from 'legacy/state/swap/TradeGp'

import { CompatibilityIssuesWarning } from 'modules/trade/pure/CompatibilityIssuesWarning'
import { NoImpactWarning } from 'modules/trade/pure/NoImpactWarning'
import { TradeUrlParams } from 'modules/trade/types/TradeRawState'

import { ZeroApprovalWarning } from 'common/pure/ZeroApprovalWarning'

import { TwapSuggestionBanner } from './banners/TwapSuggestionBanner'

export interface SwapWarningsTopProps {
  chainId: SupportedChainId
  trade: TradeGp | undefined
  account: string | undefined
  feeWarningAccepted: boolean
  impactWarningAccepted: boolean
  hideUnknownImpactWarning: boolean
  showApprovalBundlingBanner: boolean
  showWrapBundlingBanner: boolean
  shouldZeroApprove: boolean
  showSafeWcBundlingBanner: boolean
  showTwapSuggestionBanner: boolean
  nativeCurrencySymbol: string
  wrappedCurrencySymbol: string
  buyingFiatAmount: CurrencyAmount<Currency> | null
  priceImpact: Percent | undefined
  tradeUrlParams: TradeUrlParams
  isSuggestedSlippage: boolean | undefined
  slippageBps: number | undefined

  setFeeWarningAccepted(cb: (state: boolean) => boolean): void

  setImpactWarningAccepted(cb: (state: boolean) => boolean): void
}

export interface SwapWarningsBottomProps {
  isSupportedWallet: boolean
  swapIsUnsupported: boolean
  currencyIn: Currency | undefined
  currencyOut: Currency | undefined
}

const StyledNoImpactWarning = styled(NoImpactWarning)`
  margin-bottom: 15px;
`

export const SwapWarningsTop = React.memo(function (props: SwapWarningsTopProps) {
  const {
    chainId,
    trade,
    account,
    feeWarningAccepted,
    impactWarningAccepted,
    hideUnknownImpactWarning,
    showApprovalBundlingBanner,
    showWrapBundlingBanner,
    showSafeWcBundlingBanner,
    showTwapSuggestionBanner,
    nativeCurrencySymbol,
    wrappedCurrencySymbol,
    setFeeWarningAccepted,
    setImpactWarningAccepted,
    shouldZeroApprove,
    buyingFiatAmount,
    priceImpact,
    tradeUrlParams,
    isSuggestedSlippage,
    slippageBps,
  } = props

  return (
    <>
      {shouldZeroApprove && <ZeroApprovalWarning currency={trade?.inputAmount.currency} />}
      <HighFeeWarning
        trade={trade}
        acceptedStatus={feeWarningAccepted}
        acceptWarningCb={account ? () => setFeeWarningAccepted((state) => !state) : undefined}
      />
      <HighSuggestedSlippageWarning isSuggestedSlippage={isSuggestedSlippage} slippageBps={slippageBps} />
      {!hideUnknownImpactWarning && (
        <StyledNoImpactWarning
          isAccepted={impactWarningAccepted}
          acceptCallback={() => setImpactWarningAccepted((state) => !state)}
        />
      )}
      {showApprovalBundlingBanner && <BundleTxApprovalBanner />}
      {showWrapBundlingBanner && (
        <BundleTxWrapBanner nativeCurrencySymbol={nativeCurrencySymbol} wrappedCurrencySymbol={wrappedCurrencySymbol} />
      )}
      {showSafeWcBundlingBanner && (
        <BundleTxSafeWcBanner nativeCurrencySymbol={nativeCurrencySymbol} supportsWrapping />
      )}

      {showTwapSuggestionBanner && (
        <TwapSuggestionBanner
          chainId={chainId}
          priceImpact={priceImpact}
          buyingFiatAmount={buyingFiatAmount}
          tradeUrlParams={tradeUrlParams}
          sellAmount={trade?.inputAmount.toExact()}
        />
      )}
    </>
  )
}, genericPropsChecker)

export const SwapWarningsBottom = React.memo(function (props: SwapWarningsBottomProps) {
  const { isSupportedWallet, swapIsUnsupported, currencyIn, currencyOut } = props

  return (
    <>
      {currencyIn && currencyOut && swapIsUnsupported && (
        <CompatibilityIssuesWarning
          currencyIn={currencyIn}
          currencyOut={currencyOut}
          isSupportedWallet={isSupportedWallet}
        />
      )}
    </>
  )
}, genericPropsChecker)
