import { useCallback, useState } from 'react';
import { UniqueNFTFactory } from '@unique-nft/solidity-interfaces';
import { ethers } from 'ethers';
import { BN } from 'bn.js';
import { UseMutateAsyncFunction } from 'react-query';
import {
  ExtrinsicResultResponse,
  SetSponsorshipBody,
  WithOptionalAddress,
} from '@unique-nft/sdk';
import { Address } from '@unique-nft/utils';

import { useMetamaskFee } from './useMetamaskFee';

const provider =
  (window as any).ethereum && new ethers.providers.Web3Provider((window as any).ethereum);

export function useMetamaskCollectionSetSponsor() {
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState(false);

  const getEstimateGas = useCallback(
    async ({
      address,
      collectionId,
      newSponsor,
    }: Omit<SetSponsorshipBody, 'address'> & WithOptionalAddress) => {
      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const toCross = Address.extract.ethCrossAccountId(newSponsor);

      const estimateGas = await nftFactory.estimateGas.setCollectionSponsorCross(
        toCross,
        {
          from: address,
        },
      );
      return new BN(estimateGas.toString());
    },
    [],
  );

  const { gas, gasPrice, ...feeResult } =
    useMetamaskFee<SetSponsorshipBody>(getEstimateGas);

  const submitWaitResult: UseMutateAsyncFunction<
    ExtrinsicResultResponse<any> | undefined,
    | Error
    | {
        extrinsicError: ExtrinsicResultResponse<any>;
      },
    { payload: SetSponsorshipBody; senderAddress?: string | undefined }
  > = async ({
    payload,
  }: {
    payload: SetSponsorshipBody;
    senderAddress?: string | undefined;
  }) => {
    setIsLoadingSubmitResult(true);
    try {
      const { collectionId, address, newSponsor } = payload;

      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const toCross = Address.extract.ethCrossAccountId(newSponsor);
      const tx = await nftFactory.setCollectionSponsorCross(toCross, {
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
