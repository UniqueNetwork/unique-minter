import { FeeResponse, IMutation, WithOptionalAddress } from '@unique-nft/sdk';
import { useMutation } from 'react-query';

import { truncateDecimalsBalanceSheet } from '@app/utils';
import { UNKNOWN_ERROR_MSG } from '@app/api/restApi/hooks/constants';

export const useExtrinsicFee = <T extends WithOptionalAddress, R>(
  getFeeEndpoint: IMutation<T, R>['getFee'],
) => {
  const getFee = (data: T) => getFeeEndpoint(data);

  const feeMutationQueryResult = useMutation<{ fee: FeeResponse }, Error, T>(getFee);

  return {
    fee: feeMutationQueryResult.data?.fee.amount || '',
    feeFormatted: feeMutationQueryResult.data
      ? [
          truncateDecimalsBalanceSheet(feeMutationQueryResult.data.fee.amount),
          feeMutationQueryResult.data.fee.unit,
        ].join(' ')
      : '',
    getFee: feeMutationQueryResult.mutateAsync,
    feeStatus: feeMutationQueryResult.status,
    feeLoading: feeMutationQueryResult.isLoading,
    feeError: feeMutationQueryResult.isError
      ? feeMutationQueryResult.error?.message || UNKNOWN_ERROR_MSG
      : null,
  };
};
