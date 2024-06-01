import { useCallback, useState } from 'react';
import { UniqueNFTFactory } from '@unique-nft/solidity-interfaces';
import { ethers } from 'ethers';
import { BN } from 'bn.js';
import { UseMutateAsyncFunction } from 'react-query';
import {
  ExtrinsicResultResponse,
  SetCollectionPermissionsBody,
  WithOptionalAddress,
} from '@unique-nft/sdk';

import { useMetamaskFee } from './useMetamaskFee';

const provider =
  (window as any).ethereum && new ethers.providers.Web3Provider((window as any).ethereum);

export function useMetamaskCollectionSetPermissions() {
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState(false);

  const getEstimateGas = useCallback(
    async ({
      address,
      collectionId,
      permissions,
    }: Omit<SetCollectionPermissionsBody, 'address'> & WithOptionalAddress) => {
      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const estimateGas = await nftFactory.estimateGas['setCollectionNesting(bool)'](
        !!permissions.nesting?.tokenOwner,
        {
          from: address,
        },
      );
      return new BN(estimateGas.toString());
    },
    [],
  );

  const { gas, gasPrice, ...feeResult } =
    useMetamaskFee<SetCollectionPermissionsBody>(getEstimateGas);

  const submitWaitResult: UseMutateAsyncFunction<
    ExtrinsicResultResponse<any> | undefined,
    | Error
    | {
        extrinsicError: ExtrinsicResultResponse<any>;
      },
    { payload: SetCollectionPermissionsBody; senderAddress?: string | undefined }
  > = async ({
    payload,
  }: {
    payload: SetCollectionPermissionsBody;
    senderAddress?: string | undefined;
  }) => {
    setIsLoadingSubmitResult(true);
    try {
      const { collectionId, address, permissions } = payload;

      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const tx = await nftFactory['setCollectionNesting(bool)'](
        !!permissions.nesting?.tokenOwner,
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
