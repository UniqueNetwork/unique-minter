import { useEffect, useState } from 'react';
import { ApolloQueryResult } from '@apollo/client';

import { useGraphQlGetTokensCollection } from '@app/api/graphQL/tokens/useGraphQlGetTokensCollection';
import {
  BundleTreeData,
  NestingToken,
  useGraphQLGetBundleTree,
} from '@app/api/graphQL/tokens/useGraphQlGetBundleTree';
import { Token } from '@app/api/graphQL/types';

export type TokenInfo = Pick<
  Token,
  'token_id' | 'token_name' | 'token_prefix' | 'collection_id' | 'image'
>;

export const useAllOwnedTokensByCollection = (
  collectionId?: number,
  options?: { excludeTokenId?: number },
) => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);

  useEffect(() => {
    setTokens([]);
  }, [collectionId]);

  const tokensData = useGraphQlGetTokensCollection({
    collectionId,
    excludeCurrentTokenId: options?.excludeTokenId,
  });

  const { refetch: fetchBundle, isBundleFetching } = useGraphQLGetBundleTree();

  useEffect(() => {
    if (tokensData.isTokensLoading || !tokensData.tokens || !collectionId) {
      return;
    }
    setTokens(tokensData.tokens);

    tokensData.tokens.forEach(async (token) => {
      if (token.nested) {
        const bundleData: ApolloQueryResult<BundleTreeData> = await fetchBundle({
          collectionId: token.collection_id,
          tokenId: token.token_id,
        });

        const getTokensFromBundle = ({
          token_id,
          token_name,
          token_prefix,
          collection_id,
          image,
          nestingChildren,
        }: NestingToken): TokenInfo[] => {
          const tokenData: TokenInfo = {
            token_id,
            token_name,
            token_prefix: token_prefix || '',
            collection_id,
            image: { fullUrl: image.fullUrl, ipfsCid: '' },
          };
          if (!nestingChildren) {
            return [tokenData];
          }

          const children = nestingChildren.map(getTokensFromBundle);

          return [tokenData, ...children.flat()];
        };

        const nestedTokens =
          bundleData.data.bundleTree.nestingChildren?.map(getTokensFromBundle);

        setTokens((tokens) =>
          [...tokens, ...(nestedTokens?.flat() || [])].sort((tokenA, tokenB) =>
            tokenA.token_id > tokenB.token_id ? 1 : -1,
          ),
        );
      }
    });
  }, [tokensData.tokens, fetchBundle]);

  return {
    tokens,
    isFetchingTokens: tokensData.isTokensLoading || isBundleFetching,
  };
};
