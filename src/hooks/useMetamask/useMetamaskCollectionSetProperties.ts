import { useCallback, useState } from 'react';
import { UniqueNFTFactory } from '@unique-nft/solidity-interfaces';
import { ethers } from 'ethers';
import { BN } from 'bn.js';
import { UseMutateAsyncFunction } from 'react-query';
import {
  ExtrinsicResultResponse,
  SetCollectionPropertiesBody,
  SetCollectionPropertiesParsed,
  WithOptionalAddress,
} from '@unique-nft/sdk';
import { Utf16 } from '@unique-nft/utils/string';

import { useMetamaskFee } from './useMetamaskFee';

const provider =
  (window as any).ethereum && new ethers.providers.Web3Provider((window as any).ethereum);

export function useMetamaskCollectionSetProperties() {
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState(false);
  const getEstimateGas = useCallback(
    async ({
      address,
      collectionId,
    }: Omit<SetCollectionPropertiesBody, 'address'> & WithOptionalAddress) => {
      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const estimateGas = await nftFactory.estimateGas.setCollectionProperties([], {
        from: address,
      });

      return new BN(estimateGas.toString());
    },
    [],
  );

  const { gas, gasPrice, ...feeResult } =
    useMetamaskFee<SetCollectionPropertiesBody>(getEstimateGas);

  const submitWaitResult: UseMutateAsyncFunction<
    ExtrinsicResultResponse<SetCollectionPropertiesParsed> | undefined,
    | Error
    | {
        extrinsicError: ExtrinsicResultResponse<any>;
      },
    { payload: SetCollectionPropertiesBody; senderAddress?: string | undefined }
  > = async ({
    payload,
  }: {
    payload: SetCollectionPropertiesBody;
    senderAddress?: string | undefined;
  }) => {
    setIsLoadingSubmitResult(true);
    try {
      const { properties, collectionId } = payload;

      const encodedSchema = properties.map(({ key, value }) => ({
        key,
        value: Utf16.stringToNumberArray(value || ''),
      }));

      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const setPropertiesTx = await nftFactory.setCollectionProperties(encodedSchema);
      await setPropertiesTx.wait();
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
