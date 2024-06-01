import { QueriesResults, useQueries } from 'react-query';
import { AllBalancesResponse } from '@unique-nft/sdk';
import { Sdk } from '@unique-nft/sdk/full';
import { Address } from '@unique-nft/utils';
import { useCallback } from 'react';

import { calculateSliceBalance } from './utils';
import { queryKeys } from '../keysConfig';

export const useAccountWithdrawableBalancesService = (
  chainsUrl: string[],
  address?: string,
): { results: QueriesResults<AllBalancesResponse[]>; refetchAll(): Promise<void> } => {
  const results: QueriesResults<AllBalancesResponse[]> = useQueries<
    AllBalancesResponse[]
  >(
    chainsUrl.map((baseUrl) => {
      return {
        queryKey: queryKeys.account.withdraw(`${baseUrl}-${address}`),
        queryFn: async () => {
          if (!address || !Address.is.substrateAddress(address)) {
            return Promise.resolve(undefined);
          }
          try {
            const api = new Sdk({ baseUrl });

            const balance = await api.balance.get({
              address: Address.mirror.substrateToEthereum(address),
            });

            return Promise.resolve(calculateSliceBalance(balance));
          } catch (e) {
            return Promise.reject(e);
          }
        },
        enabled: chainsUrl.length !== 0 && !!address,
        refetchOnMount: 'always',
        refetchIntervalInBackground: true,
        refetchInterval: 60_000,
      };
    }),
  );

  const refetchAll = useCallback(async () => {
    await Promise.all(results.map(({ refetch }) => refetch({ fetching: true })));
  }, [results]);

  return {
    results,
    refetchAll,
  };
};
