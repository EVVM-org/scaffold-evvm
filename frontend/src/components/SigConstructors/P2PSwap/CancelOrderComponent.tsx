'use client'
import React from 'react'
import { config } from '@/config/index'
import {
  TitleAndLink,
  NumberInputWithGenerator,
  AddressInputField,
  PrioritySelector,
  DataDisplayWithClear,
  HelperInfo,
} from '@/components/SigConstructors/InputsAndModules'

import { getAccountWithRetry } from '@/utils/getAccountWithRetry'

import { getWalletClient } from 'wagmi/actions'
import {
  EVVMSignatureBuilder,
  CancelOrderInputData,
  P2PSwapSignatureBuilder,
} from '@evvm/viem-signature-library'
import { executeCancelOrder } from '@/utils/TransactionExecuter'
import { MATE_TOKEN_ADDRESS } from '@/utils/constants'

interface CancelOrderComponentProps {
  evvmID: string
  p2pSwapAddress: string
}

export const CancelOrderComponent = ({
  evvmID,
  p2pSwapAddress,
}: CancelOrderComponentProps) => {
  const [priority, setPriority] = React.useState('low')
  const [dataToGet, setDataToGet] = React.useState<CancelOrderInputData | null>(
    null
  )

  /**
   * Create the signature, prepare data to make the function call
   */
  const makeSig = async () => {
    const walletData = await getAccountWithRetry(config)
    if (!walletData) return

    const getValue = (id: string) =>
      (document.getElementById(id) as HTMLInputElement).value

    // retrieve variables from inputs
    // todo: replace this approach with actual state usage
    const nonce = BigInt(getValue('nonceInput_CancelOrder'))
    const tokenA = getValue('tokenA_CancelOrder') as `0x${string}`
    const tokenB = getValue('tokenB_CancelOrder') as `0x${string}`
    const orderId = BigInt(getValue('orderId_CancelOrder'))
    const priorityFee = BigInt(getValue('priorityFee_CancelOrder'))
    const nonce_EVVM = BigInt(getValue('nonce_EVVM_CancelOrder'))

    try {
      const walletClient = await getWalletClient(config)
      // two signature builders because we need two signatures in order to make
      // this one work
      const evvmSignatureBuilder = new (EVVMSignatureBuilder as any)(
        walletClient,
        walletData
      )
      const p2pSwapSignatureBuilder = new (P2PSwapSignatureBuilder as any)(
        walletClient,
        walletData
      )

      // create evvm pay() signature
      const signatureEVVM = await evvmSignatureBuilder.signPay(
        BigInt(evvmID),
        p2pSwapAddress,
        MATE_TOKEN_ADDRESS,
        0,
        priorityFee,
        nonce_EVVM,
        priority === 'high',
        p2pSwapAddress
      )

      // create p2pswap cancelOrder() signature
      const signatureP2P = await p2pSwapSignatureBuilder.cancelOrder(
        BigInt(evvmID),
        nonce,
        tokenA,
        tokenB,
        orderId
      )

      // prepare data to execute transaction (send it to state)
      setDataToGet({
        user: walletData.address as `0x${string}`,
        metadata: {
          nonce,
          tokenA,
          tokenB,
          orderId,
          signature: signatureP2P,
        },
        priorityFee,
        nonce_EVVM,
        priorityFlag_EVVM: priority === 'high',
        signature_EVVM: signatureEVVM,
      })
    } catch (error) {
      console.error('Error creating signature:', error)
    }
  }

  const execute = async () => {
    if (!dataToGet) {
      console.error('No data to execute cancelOrder')
      return
    }

    if (!p2pSwapAddress) {
      console.error('P2PSwap address is not provided')
      return
    }

    executeCancelOrder(dataToGet, p2pSwapAddress as `0x${string}`)
      .then(() => {
        console.log('Order cancelled successfully')
      })
      .catch((error) => {
        console.error('Error executing transaction:', error)
      })
  }

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <TitleAndLink
        title="Cancel Order"
        link="https://www.evvm.info/docs/SignatureStructures/P2PSwap/CancelOrderSignatureStructure"
      />
      <br />

      <AddressInputField
        label="Token A address"
        inputId="tokenA_CancelOrder"
        placeholder="Enter token A address"
      />

      <AddressInputField
        label="Token B address"
        inputId="tokenB_CancelOrder"
        placeholder="Enter token B address"
      />

      {[
        {
          label: 'Order ID',
          id: 'orderId_CancelOrder',
          type: 'number',
        },
        {
          label: 'Priority fee (paid in MATE TOKEN)',
          id: 'priorityFee_CancelOrder',
          type: 'number',
        },
      ].map(({ label, id, type }) => (
        <div key={id} style={{ marginBottom: '1rem' }}>
          <p>{label}</p>
          <input
            type={type}
            placeholder={`Enter ${label.toLowerCase()}`}
            id={id}
            style={{
              color: 'black',
              backgroundColor: 'white',
              height: '2rem',
              width: '25rem',
            }}
          />
        </div>
      ))}

      <PrioritySelector onPriorityChange={setPriority} />

      {/* Nonce section with automatic generator */}

      <NumberInputWithGenerator
        label="Nonce for P2PSwap"
        inputId="nonceInput_CancelOrder"
        placeholder="Enter nonce"
        showRandomBtn={true}
      />

      <NumberInputWithGenerator
        label="Nonce for EVVM contract interaction"
        inputId="nonce_EVVM_CancelOrder"
        placeholder="Enter nonce"
        showRandomBtn={priority !== 'low'}
      />

      <div>
        {priority === 'low' && (
          <HelperInfo label="How to find my sync nonce?">
            <div>
              You can retrieve your next sync nonce from the EVVM contract using
              the <code>getNextCurrentSyncNonce</code> function.
            </div>
          </HelperInfo>
        )}
      </div>

      {/* Create signature button */}
      <button
        onClick={makeSig}
        style={{
          padding: '0.5rem',
          marginTop: '1rem',
        }}
      >
        Create signature
      </button>

      {/* Results section */}
      <DataDisplayWithClear
        dataToGet={dataToGet}
        onClear={() => setDataToGet(null)}
        onExecute={execute}
      />
    </div>
  )
}
