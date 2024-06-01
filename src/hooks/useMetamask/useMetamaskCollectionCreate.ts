import { useCallback, useState } from 'react';
import { CollectionHelpersFactory } from '@unique-nft/solidity-interfaces';
import { ethers } from 'ethers';
import { BN } from 'bn.js';
import { UseMutateAsyncFunction } from 'react-query';
import {
  ExtrinsicResultResponse,
  CreateCollectionBody,
  CreateCollectionParsed,
  WithOptionalAddress,
} from '@unique-nft/sdk';
import { Address } from '@unique-nft/utils';

import { useMetamaskFee } from './useMetamaskFee';

const provider =
  (window as any).ethereum && new ethers.providers.Web3Provider((window as any).ethereum);

export function useMetamaskCollectionCreate() {
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState(false);
  const getEstimateGas = useCallback(
    async ({
      address,
      tokenPrefix,
      description,
      name,
    }: Omit<CreateCollectionBody, 'address'> & WithOptionalAddress) => {
      const collectionHelpers = await CollectionHelpersFactory(provider?.getSigner());

      const fee = await collectionHelpers.collectionCreationFee();

      const estimateGas = await collectionHelpers.estimateGas.createNFTCollection(
        name,
        description,
        tokenPrefix,
        {
          from: address,
          value: fee,
        },
      );

      return new BN(estimateGas.toString());
    },
    [],
  );

  const { gas, gasPrice, ...feeResult } =
    useMetamaskFee<CreateCollectionBody>(getEstimateGas);

  const submitWaitResult: UseMutateAsyncFunction<
    ExtrinsicResultResponse<CreateCollectionParsed> | undefined,
    | Error
    | {
        extrinsicError: ExtrinsicResultResponse<any>;
      },
    { payload: CreateCollectionBody; senderAddress?: string | undefined }
  > = async ({
    payload,
  }: {
    payload: CreateCollectionBody;
    senderAddress?: string | undefined;
  }) => {
    setIsLoadingSubmitResult(true);
    try {
      const { name, description, tokenPrefix, address } = payload;

      const collectionHelpers = await CollectionHelpersFactory(provider?.getSigner());
      const fee = await collectionHelpers.collectionCreationFee();
      const createCollectionTx = await collectionHelpers.createNFTCollection(
        name,
        description,
        tokenPrefix,
        {
          from: address,
          value: fee,
        },
      );

      const createCollectionResult = await createCollectionTx.wait();

      const collectionAddress = createCollectionResult.events?.[0].args
        ?.collectionId as string;

      const collectionId = Address.collection.addressToId(collectionAddress);

      return {
        isCompleted: true,
        parsed: { collectionId },
      } as unknown as ExtrinsicResultResponse<CreateCollectionParsed>;
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
