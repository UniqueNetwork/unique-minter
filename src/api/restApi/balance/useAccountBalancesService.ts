import { QueriesResults, useQueries } from 'react-query';
import Sdk, { AllBalancesResponse } from '@unique-nft/sdk';

import { calculateSliceBalance } from './utils';
import { queryKeys } from '../keysConfig';

// Запрос по всем чейнам баланса для выбранного аккаунта
export const useAccountBalancesService = (
  chainsUrl: string[],
  address?: string,
): QueriesResults<AllBalancesResponse[]> => {
  return useQueries<AllBalancesResponse[]>(
    chainsUrl.map((baseUrl) => {
      return {
        queryKey: queryKeys.account.chain(`${baseUrl}-${address}`),
        queryFn: async () => {
          try {
            const api = new Sdk({ baseUrl });
            const balance = await api.balance.get({ address: address! });
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
};
