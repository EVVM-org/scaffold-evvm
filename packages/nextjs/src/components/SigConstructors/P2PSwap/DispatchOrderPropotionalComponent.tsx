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
  createSignerWithViem,
  Core,
  P2PSwap,
  type IDispatchOrderData as DispatchOrderFillPropotionalFeeInputData,
} from '@evvm/evvm-js'
import { executeDispatchOrderFillProportionalFee } from '@/utils/transactionExecuters'

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any)
      const chainId = await signer.getChainId()
      const evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS as `0x${string}`
      const evvm = new Core({ signer, address: evvmAddress, chainId })
      const p2pSwap = new P2PSwap({ signer, address: p2pSwapAddress as `0x${string}`, chainId })

      // Create EVVM pay action first
      const evvmAction = await evvm.pay({
        toAddress: p2pSwapAddress as `0x${string}`,
        tokenAddress: tokenB,
        amount: amountOfTokenBToFill,
        priorityFee,
        nonce: nonce_EVVM,
        isAsyncExec: priority === 'high',
        senderExecutor: p2pSwapAddress as `0x${string}`,
      })

      if (!fee) throw new Error('Error calculating fee')

      // Create dispatch order with proportional fee action
      const p2pAction = await p2pSwap.dispatchOrder_fillPropotionalFee({
        nonce,
        tokenA,
        tokenB,
        orderId,
        amountOfTokenBToFill,
        evvmSignedAction: evvmAction,
      })

      // prepare data to execute transaction (send it to state)
      setDataToGet(p2pAction.data)
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

    executeDispatchOrderFillProportionalFee(
      dataToGet,
      p2pSwapAddress as `0x${string}`
    )
      .then(() => {
        console.log('Order dispatched successfully')
      })
      .catch((error: unknown) => {
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
