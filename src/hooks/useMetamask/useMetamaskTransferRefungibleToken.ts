import { useCallback, useState } from 'react';
import { UniqueRefungibleTokenFactory } from '@unique-nft/solidity-interfaces';
import { ethers } from 'ethers';
import { BN } from 'bn.js';
import { UseMutateAsyncFunction } from 'react-query';
import {
  ExtrinsicResultResponse,
  TransferRefungibleTokenParsed,
  TransferRefungibleTokenRequest,
  WithOptionalAddress,
} from '@unique-nft/sdk';
import { Address } from '@unique-nft/utils';

import { useMetamaskFee } from './useMetamaskFee';
import { getCrossStruct2 } from './utils';

const provider =
  (window as any).ethereum && new ethers.providers.Web3Provider((window as any).ethereum);

export function useMetamaskTransferRefungibleToken() {
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState(false);

  const getEstimateGas = useCallback(
    async ({
      from,
      to,
      collectionId,
      tokenId,
      amount,
    }: Omit<TransferRefungibleTokenRequest, 'address'>) => {
      if (!to || !amount) {
        return Promise.resolve(new BN(0));
      }
      console.log(from, to, collectionId, tokenId);

      const rftFactory = await UniqueRefungibleTokenFactory(
        Address.nesting.idsToAddress(collectionId, tokenId),
        provider?.getSigner(),
      );
      console.log(rftFactory, collectionId, tokenId);

      const estimateGas = await rftFactory.estimateGas.transferFromCross(
        getCrossStruct2(from),
        getCrossStruct2(to),
        amount,
      );
      return new BN(estimateGas.toString());
    },
    [],
  );

  const { gas, gasPrice, ...feeResult } =
    useMetamaskFee<TransferRefungibleTokenRequest>(getEstimateGas);

  const submitWaitResult: UseMutateAsyncFunction<
    ExtrinsicResultResponse<TransferRefungibleTokenParsed> | undefined,
    | Error
    | {
        extrinsicError: ExtrinsicResultResponse<any>;
      },
    {
      payload: Omit<TransferRefungibleTokenRequest, 'address'> & WithOptionalAddress;
      senderAddress?: string | undefined;
    }
  > = async ({
    payload,
  }: {
    payload: Omit<TransferRefungibleTokenRequest, 'address'> & WithOptionalAddress;
    senderAddress?: string | undefined;
  }) => {
    setIsLoadingSubmitResult(true);
    try {
      const { collectionId, tokenId, from, to, amount } = payload;

      if (!amount) {
        throw new Error('Amount must be a positive number');
      }
      const rftFactory = await UniqueRefungibleTokenFactory(
        { collectionId, tokenId },
        provider.getSigner(),
      );

      const tx = await rftFactory.transferFromCross(
        getCrossStruct2(from),
        getCrossStruct2(to),
        amount,
        {
          gasLimit: gas?.toString(),
          gasPrice: gasPrice?.toString(),
        },
      );

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
