import { useCallback, useState } from 'react';
import { UniqueNFTFactory } from '@unique-nft/solidity-interfaces';
import { ethers } from 'ethers';
import { BN } from 'bn.js';
import { UseMutateAsyncFunction } from 'react-query';
import {
  ExtrinsicResultResponse,
  ConfirmSponsorshipBody,
  WithOptionalAddress,
} from '@unique-nft/sdk';

import { useMetamaskFee } from './useMetamaskFee';

const provider =
  (window as any).ethereum && new ethers.providers.Web3Provider((window as any).ethereum);

export function useMetamaskCollectionConfirmSponsorship() {
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState(false);

  const getEstimateGas = useCallback(
    async ({
      address,
      collectionId,
    }: Omit<ConfirmSponsorshipBody, 'address'> & WithOptionalAddress) => {
      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const estimateGas = await nftFactory.estimateGas.confirmCollectionSponsorship({
        from: address,
      });
      return new BN(estimateGas.toString());
    },
    [],
  );

  const { gas, gasPrice, ...feeResult } =
    useMetamaskFee<ConfirmSponsorshipBody>(getEstimateGas);

  const submitWaitResult: UseMutateAsyncFunction<
    ExtrinsicResultResponse<any> | undefined,
    | Error
    | {
        extrinsicError: ExtrinsicResultResponse<any>;
      },
    { payload: ConfirmSponsorshipBody; senderAddress?: string | undefined }
  > = async ({
    payload,
  }: {
    payload: ConfirmSponsorshipBody;
    senderAddress?: string | undefined;
  }) => {
    setIsLoadingSubmitResult(true);
    try {
      const { collectionId, address } = payload;

      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const tx = await nftFactory.confirmCollectionSponsorship({
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
