import { useCallback, useState } from 'react';
import { UniqueNFTFactory } from '@unique-nft/solidity-interfaces';
import { ethers } from 'ethers';
import { BN } from 'bn.js';
import { UseMutateAsyncFunction } from 'react-query';
import {
  ExtrinsicResultResponse,
  SetCollectionLimitsBody,
  WithOptionalAddress,
} from '@unique-nft/sdk';

import { useMetamaskFee } from './useMetamaskFee';

const provider =
  (window as any).ethereum && new ethers.providers.Web3Provider((window as any).ethereum);

enum CollectionLimitsFields {
  tokenLimit = 3,
  ownerCanDestroy = 5,
}

export function useMetamaskCollectionSetLimits() {
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState(false);

  const getEstimateGas = useCallback(
    async ({
      address,
      collectionId,
      limits,
    }: Omit<SetCollectionLimitsBody, 'address'> & WithOptionalAddress) => {
      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const estimateGas = await nftFactory.estimateGas.setCollectionLimit(
        getCollectionLimitStruct(
          limits.tokenLimit !== undefined
            ? CollectionLimitsFields.tokenLimit
            : CollectionLimitsFields.ownerCanDestroy,
          limits.tokenLimit || limits.ownerCanDestroy,
        ),
        {
          from: address,
        },
      );
      return new BN(estimateGas.toString());
    },
    [],
  );

  const { gas, gasPrice, ...feeResult } =
    useMetamaskFee<SetCollectionLimitsBody>(getEstimateGas);

  const submitWaitResult: UseMutateAsyncFunction<
    ExtrinsicResultResponse<any> | undefined,
    | Error
    | {
        extrinsicError: ExtrinsicResultResponse<any>;
      },
    { payload: SetCollectionLimitsBody; senderAddress?: string | undefined }
  > = async ({
    payload,
  }: {
    payload: SetCollectionLimitsBody;
    senderAddress?: string | undefined;
  }) => {
    setIsLoadingSubmitResult(true);
    try {
      const { collectionId, address, limits } = payload;

      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const tx = await nftFactory.setCollectionLimit(
        getCollectionLimitStruct(
          limits.tokenLimit !== undefined
            ? CollectionLimitsFields.tokenLimit
            : CollectionLimitsFields.ownerCanDestroy,
          limits.tokenLimit || limits.ownerCanDestroy,
        ),
        {
          gasLimit: gas?.toString(),
          gasPrice: gasPrice?.toString(),
          from: address,
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

const getCollectionLimitStruct = (
  id: CollectionLimitsFields,
  value: number | boolean | undefined,
) => ({
  field: id,
  value: {
    status: true,
    value: ethers.BigNumber.from(typeof value === 'boolean' ? (value ? 1 : 0) : value),
  },
});
