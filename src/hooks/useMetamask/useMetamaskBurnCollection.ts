import { useCallback, useState } from 'react';
import { CollectionHelpersFactory } from '@unique-nft/solidity-interfaces';
import { ethers } from 'ethers';
import { BN } from 'bn.js';
import { UseMutateAsyncFunction } from 'react-query';
import {
  ExtrinsicResultResponse,
  DestroyCollectionBody,
  DestroyCollectionParsed,
  WithOptionalAddress,
} from '@unique-nft/sdk';

import { useMetamaskFee } from './useMetamaskFee';

const provider =
  (window as any).ethereum && new ethers.providers.Web3Provider((window as any).ethereum);

export function useMetamaskBurnCollection() {
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState(false);

  const getEstimateGas = useCallback(
    async ({
      address,
      collectionId,
    }: Omit<DestroyCollectionBody, 'address'> & WithOptionalAddress) => {
      const collectionHelper = await CollectionHelpersFactory(provider?.getSigner());

      const collectionAddress = collectionHelper.collectionAddress(collectionId);

      const estimateGas = await collectionHelper.estimateGas.destroyCollection(
        collectionAddress,
        { from: address },
      );
      return new BN(estimateGas.toString());
    },
    [],
  );

  const { gas, gasPrice, ...feeResult } =
    useMetamaskFee<DestroyCollectionBody>(getEstimateGas);

  const submitWaitResult: UseMutateAsyncFunction<
    ExtrinsicResultResponse<DestroyCollectionParsed> | undefined,
    | Error
    | {
        extrinsicError: ExtrinsicResultResponse<any>;
      },
    { payload: DestroyCollectionBody; senderAddress?: string | undefined }
  > = async ({
    payload,
  }: {
    payload: DestroyCollectionBody;
    senderAddress?: string | undefined;
  }) => {
    setIsLoadingSubmitResult(true);
    try {
      const { collectionId, address } = payload;

      const collectionHelper = await CollectionHelpersFactory(provider?.getSigner());
      const collectionAddress = collectionHelper.collectionAddress(collectionId);

      const tx = await collectionHelper.destroyCollection(collectionAddress, {
        gasLimit: gas?.toString(),
        gasPrice: gasPrice?.toString(),
        from: address,
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
