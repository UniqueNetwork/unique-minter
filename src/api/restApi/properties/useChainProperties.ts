import Sdk, { ChainPropertiesResponse } from '@unique-nft/sdk';
import { useQueries, UseQueryResult } from 'react-query';

import { NetworkType } from '@app/types';

import { queryKeys } from '../keysConfig';

type chains = {
  network: string;
  api: string;
};

export const useChainProperties = (chains: chains[]) => {
  const queryResults = useQueries<ChainPropertiesResponse[]>(
    chains.map(({ api, network }) => {
      return {
        queryKey: queryKeys.chain.properties(network),
        queryFn: () => new Sdk({ baseUrl: api }).common.chainProperties,
      };
    }),
  );
  const chainProperty: Record<NetworkType, UseQueryResult> = {};

  chains.forEach(({ api, network }, idx) => {
    chainProperty[network] = queryResults[idx];
  });

  return chainProperty;
};
