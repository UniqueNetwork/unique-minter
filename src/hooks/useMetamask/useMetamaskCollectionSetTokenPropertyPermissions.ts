import { useCallback, useState } from 'react';
import { UniqueNFTFactory } from '@unique-nft/solidity-interfaces';
import { ethers } from 'ethers';
import { BN } from 'bn.js';
import { UseMutateAsyncFunction } from 'react-query';
import {
  ExtrinsicResultResponse,
  SetPropertyPermissionsBody,
  SetPropertyPermissionsParsed,
  WithOptionalAddress,
} from '@unique-nft/sdk';

import { useMetamaskFee } from './useMetamaskFee';

const provider =
  (window as any).ethereum && new ethers.providers.Web3Provider((window as any).ethereum);

export function useMetamaskCollectionSetTokenPropertyPermissions() {
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState(false);
  const getEstimateGas = useCallback(
    async ({
      collectionId,
    }: Omit<SetPropertyPermissionsBody, 'address'> & WithOptionalAddress) => {
      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const estimateGas = await nftFactory.estimateGas.setTokenPropertyPermissions([]);

      return new BN(estimateGas.toString());
    },
    [],
  );

  const { gas, gasPrice, ...feeResult } =
    useMetamaskFee<SetPropertyPermissionsBody>(getEstimateGas);

  const submitWaitResult: UseMutateAsyncFunction<
    ExtrinsicResultResponse<SetPropertyPermissionsParsed> | undefined,
    | Error
    | {
        extrinsicError: ExtrinsicResultResponse<any>;
      },
    { payload: SetPropertyPermissionsBody; senderAddress?: string | undefined }
  > = async ({
    payload,
  }: {
    payload: SetPropertyPermissionsBody;
    senderAddress?: string | undefined;
  }) => {
    setIsLoadingSubmitResult(true);
    try {
      const { collectionId, propertyPermissions, address } = payload;

      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());
      const setTokenPropertyPermissionsTx = await nftFactory.setTokenPropertyPermissions(
        propertyPermissions.map(({ key, permission }) => ({
          key,
          permissions: Object.keys(permission).map((_key) => ({
            code: { mutable: 0, collectionAdmin: 2, tokenOwner: 1 }[_key] || 0,
            value: permission[_key as keyof typeof permission],
          })),
        })),
      );
      await setTokenPropertyPermissionsTx.wait();
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
