import { ExtrinsicResultResponse, IMutation, WithOptionalAddress } from '@unique-nft/sdk';
import { useMutation, useQueryClient } from 'react-query';

import { useAccounts } from '@app/hooks';
import { UNKNOWN_ERROR_MSG } from '@app/api/restApi/hooks/constants';

import { queryKeys } from '../keysConfig';

export const useExtrinsicFlow = <A extends WithOptionalAddress, R>(
  mutation: IMutation<A, R>,
) => {
  const { signMessage } = useAccounts();
  const { selectedAccount } = useAccounts();
  const queryClient = useQueryClient();

  const submitWaitResult = async ({
    senderAddress,
    payload,
  }: {
    payload: A;
    senderAddress?: string;
  }) => {
    const build = await mutation.build(payload);

    const account = senderAddress || selectedAccount?.normalizedAddress;

    const signature = await signMessage(build, account);

    const res = await mutation.submitWaitResult({
      signerPayloadJSON: build.signerPayloadJSON,
      signature,
    });

    if (res.error) {
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject({
        extrinsicError: res,
      });
    }

    return res;
  };

  const submitResultMutationQueryResult = useMutation<
    ExtrinsicResultResponse<R> | undefined,
    { extrinsicError: ExtrinsicResultResponse<any> } | Error,
    {
      payload: A;
      senderAddress?: string | undefined;
    },
    unknown
  >(submitWaitResult, {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.account.chain._def);
      queryClient.invalidateQueries(queryKeys.account.balance._def);
    },
  });

  return {
    submitWaitResult: submitResultMutationQueryResult.mutateAsync,
    isLoadingSubmitResult: submitResultMutationQueryResult.isLoading,
    submitWaitResultError: submitResultMutationQueryResult.isError
      ? 'extrinsicError' in submitResultMutationQueryResult.error
        ? // @ts-ignore
          submitResultMutationQueryResult.error?.extrinsicError?.error.message
        : submitResultMutationQueryResult.error?.message || UNKNOWN_ERROR_MSG
      : null,
  };
};
