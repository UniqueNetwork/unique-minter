import { IMutation, WithOptionalAddress } from '@unique-nft/sdk';

import { useExtrinsicFee, useExtrinsicFlow } from '@app/api';

export const useExtrinsicMutation = <A extends WithOptionalAddress, R>(
  mutation: IMutation<A, R>,
) => {
  const feeResult = useExtrinsicFee(mutation.getFee.bind(mutation));

  const submitResult = useExtrinsicFlow(mutation);

  return {
    ...feeResult,
    ...submitResult,
  };
};
