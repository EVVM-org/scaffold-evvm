'use client'
import React, { useMemo } from 'react'
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
  DispatchOrderFillPropotionalFeeInputData,
  P2PSwapSignatureBuilder,
} from '@evvm/viem-signature-library'
import { executeDispatchOrderFillPropotionalFee } from '@/utils/TransactionExecuter'

interface DispatchOrderFillPropotionalFeeComponentProps {
  evvmID: string
  p2pSwapAddress: string
}

export const DispatchOrderFillPropotionalFeeComponent = ({
  evvmID,
  p2pSwapAddress,
}: DispatchOrderFillPropotionalFeeComponentProps) => {
  const [priority, setPriority] = React.useState('low')
  const [amountB, setAmountB] = React.useState(0n)
  const [dataToGet, setDataToGet] =
    React.useState<DispatchOrderFillPropotionalFeeInputData | null>(null)

  const fee: bigint = useMemo(
    () => (amountB * 500n) / 10_000n,
    [amountB]
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
    const nonce = BigInt(getValue('nonceInput_DispatchOrderFillPropotionalFee'))
    const tokenA = getValue(
      'tokenA_DispatchOrderFillPropotionalFee'
    ) as `0x${string}`
    const tokenB = getValue(
      'tokenB_DispatchOrderFillPropotionalFee'
    ) as `0x${string}`
    const amountB = BigInt(getValue('amountB_DispatchOrderFillPropotionalFee'))
    const orderId = BigInt(getValue('orderId_DispatchOrderFillPropotionalFee'))
    const priorityFee = BigInt(
      getValue('priorityFee_DispatchOrderFillPropotionalFee')
    )
    const nonce_EVVM = BigInt(
      getValue('nonce_EVVM_DispatchOrderFillPropotionalFee')
    )

    const amountOfTokenBToFill = amountB + fee

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
        tokenB,
        amountOfTokenBToFill,
        priorityFee,
        nonce_EVVM,
        priority === 'high',
        p2pSwapAddress
      )

      // create p2pswap dispatchOrderFillPropotionalFee() signature
      const signatureP2P = await p2pSwapSignatureBuilder.dispatchOrder(
        BigInt(evvmID),
        nonce,
        tokenA,
        tokenB,
        orderId
      )
      if (!fee) throw new Error('Error calculating fee')

      // prepare data to execute transaction (send it to state)
      setDataToGet({
        user: walletData.address as `0x${string}`,
        metadata: {
          nonce,
          tokenA,
          tokenB,
          orderId,
          amountOfTokenBToFill,
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
      console.error('No data to execute dispatchOrderFillPropotionalFee')
      return
    }

    if (!p2pSwapAddress) {
      console.error('P2PSwap address is not provided')
      return
    }

    executeDispatchOrderFillPropotionalFee(
      dataToGet,
      p2pSwapAddress as `0x${string}`
    )
      .then(() => {
        console.log('Order dispatched successfully')
      })
      .catch((error) => {
        console.error('Error executing transaction:', error)
      })
  }

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      <TitleAndLink
        title="Dispatch Order (with proportional fee)"
        link="https://www.evvm.info/docs/SignatureStructures/P2PSwap/DispatchOrderSignatureStructure"
      />
      <br />

      <AddressInputField
        label="Token A address"
        inputId="tokenA_DispatchOrderFillPropotionalFee"
        placeholder="Enter token A address"
      />

      <AddressInputField
        label="Token B address"
        inputId="tokenB_DispatchOrderFillPropotionalFee"
        placeholder="Enter token B address"
      />

      {[
        {
          label: 'Order ID',
          id: 'orderId_DispatchOrderFillPropotionalFee',
          type: 'number',
        },
        {
          label: 'Priority fee',
          id: 'priorityFee_DispatchOrderFillPropotionalFee',
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

      <div style={{ marginBottom: '1rem' }}>
        <p>Amount of token B to fill</p>
        <div className="flex">
          <input
            type="number"
            placeholder="Enter amount of token b to fill"
            id="amountB_DispatchOrderFillPropotionalFee"
            style={{
              color: 'black',
              backgroundColor: 'white',
              height: '2rem',
              width: '25rem',
            }}
            onInput={(e) => setAmountB(BigInt(e.currentTarget.value))}
          />
        </div>
      </div>

      <PrioritySelector onPriorityChange={setPriority} />

      {/* Nonce section with automatic generator */}

      <NumberInputWithGenerator
        label="Nonce for P2PSwap"
        inputId="nonceInput_DispatchOrderFillPropotionalFee"
        placeholder="Enter nonce"
        showRandomBtn={true}
      />

      <NumberInputWithGenerator
        label="Nonce for EVVM contract interaction"
        inputId="nonce_EVVM_DispatchOrderFillPropotionalFee"
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
