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
  createSignerWithViem,
  Core,
  P2PSwap,
  type IMakeOrderData as MakeOrderInputData,
} from '@evvm/evvm-js'
import { executeMakeOrder } from '@/utils/transactionExecuters'

interface MakeOrderComponentProps {
  evvmID: string
  p2pSwapAddress: string
}

export const MakeOrderComponent = ({
  evvmID,
  p2pSwapAddress,
}: MakeOrderComponentProps) => {
  const [priority, setPriority] = React.useState('low')
  const [dataToGet, setDataToGet] = React.useState<MakeOrderInputData | null>(
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
    const nonce = BigInt(getValue('nonceInput_MakeOrder'))
    const tokenA = getValue('tokenA_MakeOrder') as `0x${string}`
    const tokenB = getValue('tokenB_MakeOrder') as `0x${string}`
    const amountA = BigInt(getValue('amountA_MakeOrder'))
    const amountB = BigInt(getValue('amountB_MakeOrder'))
    const priorityFee = BigInt(getValue('priorityFee_MakeOrder'))
    const nonce_EVVM = BigInt(getValue('nonce_EVVM_MakeOrder'))

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
        tokenAddress: tokenA,
        amount: amountA,
        priorityFee,
        nonce: nonce_EVVM,
        isAsyncExec: priority === 'high',
        senderExecutor: p2pSwapAddress as `0x${string}`,
        originExecutor: walletData.address as `0x${string}`,
      })

      // Create make order action
      const p2pAction = await p2pSwap.makeOrder({
        nonce,
        tokenA,
        tokenB,
        amountA,
        amountB,
        originExecutor: (walletData.address || "0x0000000000000000000000000000000000000000") as `0x${string}`,
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
      console.error('No data to execute makeOrder')
      return
    }

    if (!p2pSwapAddress) {
      console.error('P2PSwap address is not provided')
      return
    }

    executeMakeOrder(dataToGet, p2pSwapAddress as `0x${string}`)
      .then(() => {
        console.log('Order created successfully')
      })
      .catch((error: unknown) => {
        console.error('Error executing order:', error)
      })
  }

  return (
    <div className="flex flex-1 flex-col justify-center items-center">
      {!p2pSwapAddress && (
        <strong style={{ color: 'red' }}>
          Must provide a valid P2P Swap Contract address to use these functions
        </strong>
      )}
      <TitleAndLink
        title="Make Order"
        link="https://www.evvm.info/docs/SignatureStructures/P2PSwap/MakeOrderSignatureStructure"
      />
      <br />

      <AddressInputField
        label="Token A address"
        inputId="tokenA_MakeOrder"
        placeholder="Enter token A address"
      />

      <AddressInputField
        label="Token B address"
        inputId="tokenB_MakeOrder"
        placeholder="Enter token B address"
      />

      {[
        { label: 'Amount of token A', id: 'amountA_MakeOrder', type: 'number' },
        { label: 'Amount of token B', id: 'amountB_MakeOrder', type: 'number' },
        { label: 'Priority fee', id: 'priorityFee_MakeOrder', type: 'number' },
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
        inputId="nonceInput_MakeOrder"
        placeholder="Enter nonce"
        showRandomBtn={true}
      />

      <NumberInputWithGenerator
        label="Nonce for EVVM contract interaction"
        inputId="nonce_EVVM_MakeOrder"
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
