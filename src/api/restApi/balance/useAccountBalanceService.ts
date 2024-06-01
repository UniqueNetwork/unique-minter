import { useQuery, UseQueryResult } from 'react-query';
import { AllBalancesResponse } from '@unique-nft/sdk';
import { Sdk } from '@unique-nft/sdk/full';

import { useApi } from '@app/hooks';

import { queryKeys } from '../keysConfig';
import { calculateSliceBalance } from './utils';

export const useAccountBalanceService = (
  address?: string,
  networkURL?: string,
): UseQueryResult<AllBalancesResponse> => {
  const { api, currentChain } = useApi();

  const getBalance = (address: string) => {
    const apiSdk = networkURL ? new Sdk({ baseUrl: networkURL }) : api;

    return apiSdk.balance
      .get({ address })
      .then((balance: AllBalancesResponse) =>
        Promise.resolve(calculateSliceBalance(balance)),
      )
      .catch(Promise.reject);
  };

  return useQuery(
    queryKeys.account.balance(
      networkURL ? `${networkURL}-${address}` : `${currentChain.name}-${address}`,
    ),
    () => getBalance(address!),
    {
      enabled: !!address,
      refetchOnMount: true,
    },
  );
};
