import { useCallback, useState } from 'react';
import { UniqueNFTFactory } from '@unique-nft/solidity-interfaces';
import { BigNumber, ethers } from 'ethers';
import { BN } from 'bn.js';
import { UseMutateAsyncFunction } from 'react-query';
import {
  ExtrinsicResultResponse,
  CreateTokenBody,
  TokenId,
  CreateMultipleTokensBody,
  WithOptionalAddress,
} from '@unique-nft/sdk';
import { Address } from '@unique-nft/utils';
import {
  SchemaTools,
  UniqueCollectionSchemaDecoded,
  UniqueTokenToCreate,
} from '@unique-nft/schemas';
import { Utf16 } from '@unique-nft/utils/string';

import { useMetamaskFee } from './useMetamaskFee';
import { useApi } from '../useApi';

const provider =
  (window as any).ethereum && new ethers.providers.Web3Provider((window as any).ethereum);

export function useMetamaskCreateMultipleTokens() {
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState(false);
  const { api } = useApi();

  const getEstimateGas = useCallback(
    async ({
      address,
      collectionId,
    }: Omit<CreateTokenBody, 'address'> & WithOptionalAddress) => {
      if (!address) {
        return new BN(0);
      }
      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const toCross = Address.extract.ethCrossAccountId(address);

      const estimateGas = await nftFactory.estimateGas.mintCross(toCross, []);

      return new BN(estimateGas.toString());
    },
    [],
  );

  const { gas, gasPrice, ...feeResult } = useMetamaskFee<CreateTokenBody>(getEstimateGas);

  const submitWaitResult: UseMutateAsyncFunction<
    ExtrinsicResultResponse<TokenId[]> | undefined,
    | Error
    | {
        extrinsicError: ExtrinsicResultResponse<any>;
      },
    { payload: CreateMultipleTokensBody; senderAddress?: string | undefined }
  > = async ({
    payload,
  }: {
    payload: CreateMultipleTokensBody;
    senderAddress?: string | undefined;
  }) => {
    setIsLoadingSubmitResult(true);
    try {
      const { address, tokens, collectionId } = payload;

      const collection = await api.collections.get({ collectionId });
      if (!tokens.length) {
        throw new Error('UniqueTokenToCreateDto unavailable');
      }

      const nftFactory = await UniqueNFTFactory(collectionId, provider?.getSigner());

      const toCross = Address.extract.ethCrossAccountId(address);

      const ids = await Promise.all(
        tokens.map(async ({ data }) => {
          const encodedSchema = SchemaTools.tools.unique.token
            .encodeTokenToProperties(
              data as UniqueTokenToCreate,
              collection.schema as UniqueCollectionSchemaDecoded,
            )
            .map(({ key, value }) => ({
              key,
              value: Utf16.stringToNumberArray(value),
            }));

          const tx = await nftFactory.mintCross(toCross, encodedSchema);

          const createTokenResult = await tx.wait();
          const event = createTokenResult.events?.find(({ transactionHash, event }) => {
            return transactionHash === tx.hash && event === 'TokenChanged';
          });

          if (!event) {
            throw new Error('Creating NFT failed');
          }

          const tokenId = Number(event?.args?.tokenId?.toString() || 1);
          return { collectionId, tokenId };
        }),
      );

      return {
        isCompleted: true,
        parsed: ids,
      } as unknown as ExtrinsicResultResponse<TokenId[]>;
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
