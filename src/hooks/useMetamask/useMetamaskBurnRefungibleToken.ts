import { useCallback, useState } from 'react';
import { UniqueRefungibleTokenFactory } from '@unique-nft/solidity-interfaces';
import { ethers } from 'ethers';
import { BN } from 'bn.js';
import { UseMutateAsyncFunction } from 'react-query';
import {
  ExtrinsicResultResponse,
  BurnRefungibleParsed,
  BurnRefungibleBody,
  WithOptionalAddress,
} from '@unique-nft/sdk';

import { useMetamaskFee } from './useMetamaskFee';
import { getCrossStruct2 } from './utils';

const provider =
  (window as any).ethereum && new ethers.providers.Web3Provider((window as any).ethereum);

export function useMetamaskBurnRefungibleToken() {
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState(false);

  const getEstimateGas = useCallback(
    async ({
      address,
      collectionId,
      tokenId,
      amount,
    }: Omit<BurnRefungibleBody, 'address'> & WithOptionalAddress) => {
      if (!amount) {
        return Promise.resolve(new BN(0));
      }

      const rftFactory = await UniqueRefungibleTokenFactory(
        { collectionId, tokenId },
        provider?.getSigner(),
      );

      const estimateGas = await rftFactory.estimateGas.burnFromCross(
        getCrossStruct2(address),
        amount,
      );
      return new BN(estimateGas.toString());
    },
    [],
  );

  const { gas, gasPrice, ...feeResult } =
    useMetamaskFee<BurnRefungibleBody>(getEstimateGas);

  const submitWaitResult: UseMutateAsyncFunction<
    ExtrinsicResultResponse<BurnRefungibleParsed> | undefined,
    | Error
    | {
        extrinsicError: ExtrinsicResultResponse<any>;
      },
    {
      payload: Omit<BurnRefungibleBody, 'address'> & WithOptionalAddress;
      senderAddress?: string | undefined;
    }
  > = async ({
    payload,
  }: {
    payload: Omit<BurnRefungibleBody, 'address'> & WithOptionalAddress;
    senderAddress?: string | undefined;
  }) => {
    setIsLoadingSubmitResult(true);
    try {
      const { collectionId, tokenId, address, amount } = payload;

      if (!amount) {
        throw new Error('Amount must be a positive number');
      }
      const rftFactory = await UniqueRefungibleTokenFactory(
        { collectionId, tokenId },
        provider.getSigner(),
      );

      const tx = await rftFactory.burnFromCross(getCrossStruct2(address), amount, {
        gasLimit: gas?.toString(),
        gasPrice: gasPrice?.toString(),
      });

      await tx.wait();
    } catch (error: any) {
      setSubmitWaitResultError(error.message);
      throw error;
    } finally {
      setIsLoadingSubmitResult(false);
    }
    return undefined;
  };

  return {
    submitWaitResult,
    isLoadingSubmitResult,
    submitWaitResultError,
    ...feeResult,
  };
}
