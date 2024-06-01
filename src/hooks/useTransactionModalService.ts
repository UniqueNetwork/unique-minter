import { DeepPartial, FieldValues, useForm, useWatch } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import { useEffect } from 'react';
import {
  ExtrinsicResultResponse,
  FeeResponse,
  WithOptionalAddress,
} from '@unique-nft/sdk';
import { UseMutateAsyncFunction } from 'react-query';

import { useNotifications } from '@app/components';
import { Account, WalletsType } from '@app/account';

import { useIsSufficientBalance } from './useBalanceInsufficient';

type UseTransactionModalServiceProps<R, D, F extends FieldValues> = {
  MutateAsyncFunction: () => {
    fee: string | undefined;
    feeFormatted: string | undefined;
    getFee: UseMutateAsyncFunction<
      | {
          fee: FeeResponse | undefined;
        }
      | undefined,
      Error,
      Omit<D, 'address'> & WithOptionalAddress,
      unknown
    >;
    feeStatus: 'error' | 'loading' | 'idle' | 'success';
    feeLoading: boolean;
    feeError: string | null;
    submitWaitResult: UseMutateAsyncFunction<
      ExtrinsicResultResponse<R> | undefined,
      | Error
      | {
          extrinsicError: ExtrinsicResultResponse<any>;
        },
      {
        payload: Omit<D, 'address'> & WithOptionalAddress;
        senderAddress?: string | undefined;
      }
    >;
    isLoadingSubmitResult: boolean;
    submitWaitResultError: string | undefined;
  };
  account: Account<WalletsType> | undefined;
  defaultValues: DeepPartial<F>;
};

export const useTransactionFormService = <R, D, F extends FieldValues>({
  MutateAsyncFunction,
  account,
  defaultValues,
}: UseTransactionModalServiceProps<R, D, F>) => {
  const { error } = useNotifications();
  const {
    getFee,
    feeFormatted,
    submitWaitResult,
    isLoadingSubmitResult,
    feeError,
    feeLoading,
    submitWaitResultError,
  } = MutateAsyncFunction();

  const isSufficientBalance = useIsSufficientBalance(account?.address, feeFormatted);

  const form = useForm<F>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues,
  });

  const { control } = form;

  const formData = useWatch({ control });
  const [debouncedFormValues] = useDebounce(formData, 300);

  useEffect(() => {
    if (!feeError) {
      return;
    }

    error(feeError.toString());
  }, [feeError]);

  useEffect(() => {
    if (!submitWaitResultError) {
      return;
    }
    error(submitWaitResultError);
  }, [submitWaitResultError]);

  return {
    form,
    formData,
    feeFormatted,
    isLoadingSubmitResult,
    feeError,
    feeLoading,
    submitWaitResultError,
    debouncedFormValues,
    isSufficientBalance,
    getFee,
    submitWaitResult,
  };
};
