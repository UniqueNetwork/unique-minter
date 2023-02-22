import React, { useEffect, useState } from 'react';
import { Loader, Text, useNotifications } from '@unique-nft/ui-kit';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import styled from 'styled-components';
import { Address } from '@unique-nft/utils';
import { useNavigate } from 'react-router-dom';

import { useAccounts } from '@app/hooks';
import {
  CollectionNestingOption,
  useTokenGetBalance,
  useTokenRefungibleTransfer,
} from '@app/api';
import { TBaseToken } from '@app/pages/NFTDetails/type';
import { Button, Modal } from '@app/components';
import { Suggest } from '@app/components/Suggest';
import { useGraphQlCollectionsByNestingAccount } from '@app/api/graphQL/collections';
import { useGetTokenPath } from '@app/hooks/useGetTokenPath';
import { formatBlockNumber } from '@app/utils';
import {
  TokenInfo,
  useAllOwnedTokensByCollection,
} from '@app/pages/NFTDetails/hooks/useAllOwnedTokensByCollection';

import { SuggestOptionNesting } from '../CreateBundleModal/components';
import { FormWrapper, InputAmount } from '../Transfer';
import { TokenModalsProps } from '../NFTModals';
import { NestRefungibleFormDataType } from './types';
import { NestRefungibleStagesModal } from './NestRefungibleStagesModal';

export const NestRefungibleModal = <T extends TBaseToken>({
  token,
  onClose,
  onComplete,
}: TokenModalsProps<T>) => {
  const { selectedAccount } = useAccounts();
  const { info, error } = useNotifications();
  const getTokenPath = useGetTokenPath();
  const navigate = useNavigate();
  const [isWaitingComplete, setIsWaitingComplete] = useState(false);

  const {
    getFee,
    feeFormatted,
    submitWaitResult,
    isLoadingSubmitResult,
    feeError,
    feeLoading,
    submitWaitResultError,
  } = useTokenRefungibleTransfer();

  const { data: fractionsBalance, isFetching: isFetchingBalance } = useTokenGetBalance({
    collectionId: token?.collectionId,
    tokenId: token?.tokenId,
    address: selectedAccount?.address,
    isFractional: true,
  });

  const form = useForm<NestRefungibleFormDataType>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      amount: 1,
    },
  });

  const {
    formState: { isValid },
    control,
    resetField,
  } = form;

  const collectionFormData = useWatch({ control });
  const [debouncedFormValues] = useDebounce(collectionFormData, 300);

  const collectionsData = useGraphQlCollectionsByNestingAccount({
    accountAddress: selectedAccount?.address,
  });

  const { isCollectionsLoading, collections } = collectionsData;

  const { tokens, isFetchingTokens } = useAllOwnedTokensByCollection(
    collectionFormData?.collection?.collection_id,
    {
      excludeTokenId:
        collectionFormData?.collection?.collection_id === token?.collectionId
          ? token?.tokenId
          : undefined,
    },
  );

  useEffect(() => {
    if (!feeError) {
      return;
    }
    error(feeError);
  }, [feeError]);

  useEffect(() => {
    if (!submitWaitResultError) {
      return;
    }
    error(submitWaitResultError);
  }, [submitWaitResultError]);

  useEffect(() => {
    const { amount, collection, token: parentToken } = debouncedFormValues;
    const parentCollectionId = collection?.collection_id;
    const parentTokenId = parentToken?.token_id;

    if (
      !isValid ||
      !token ||
      !selectedAccount?.address ||
      !parentCollectionId ||
      !parentTokenId ||
      !amount
    ) {
      return;
    }

    getFee({
      collectionId: token.collectionId,
      tokenId: token.tokenId,
      address: selectedAccount.address,
      to: Address.nesting.idsToAddress(parentCollectionId, parentTokenId),
      amount,
    });
  }, [debouncedFormValues, token, selectedAccount?.address]);

  const nestHandler = async ({
    amount,
    collection,
    token: parentToken,
  }: NestRefungibleFormDataType) => {
    const parentCollectionId = collection?.collection_id;
    const parentTokenId = parentToken?.token_id;
    if (
      !token ||
      !selectedAccount?.address ||
      !parentCollectionId ||
      !parentTokenId ||
      !amount
    ) {
      return;
    }

    const to = Address.nesting.idsToAddress(parentCollectionId, parentTokenId);
    const { collectionId, tokenId } = token;

    try {
      setIsWaitingComplete(true);
      await submitWaitResult({
        payload: {
          collectionId,
          tokenId,
          address: selectedAccount.address,
          to,
          amount,
        },
      });
      await onComplete();
      info('RFT transferred successfully');
      setIsWaitingComplete(false);
      if (fractionsBalance?.amount === Number(amount)) {
        navigate(getTokenPath(to, collectionId, tokenId));
      }
    } catch {
      setIsWaitingComplete(false);
    }
  };

  const isNotExistTokens = tokens.length === 0;

  if (!selectedAccount || !token) {
    return null;
  }

  if (isLoadingSubmitResult || isWaitingComplete) {
    return <NestRefungibleStagesModal />;
  }

  return (
    <Modal
      isVisible={true}
      title="Nest fractional token"
      footerButtons={
        <Button
          title="Confirm"
          disabled={!isValid}
          role="primary"
          onClick={form.handleSubmit(nestHandler)}
        />
      }
      onClose={onClose}
    >
      {isFetchingBalance && <Loader isFullPage={true} />}
      <FormWrapper
        fee={isValid && feeFormatted && !feeLoading ? feeFormatted : undefined}
        feeWarning="A fee will be calculated after entering the number of fractions and choosing parent NFT"
        feeLoading={feeLoading}
      >
        <FormProvider {...form}>
          <FormRow>
            <Controller
              name="amount"
              render={({ field: { value, onChange }, fieldState }) => {
                return (
                  <InputAmount
                    label={
                      <LabelWrapper>
                        Number of fractions to be nested
                        <Text size="s" color="grey-500">{`You own: ${formatBlockNumber(
                          fractionsBalance?.amount || 0,
                        )}`}</Text>
                      </LabelWrapper>
                    }
                    value={value}
                    maxValue={fractionsBalance?.amount || 0}
                    error={!!fieldState.error}
                    statusText={fieldState.error?.message}
                    onChange={onChange}
                    onClear={() => onChange('')}
                  />
                );
              }}
              rules={{
                required: true,
                validate: (val: string) => {
                  return (
                    (Number(val) > 0 &&
                      Number(val) <= (fractionsBalance?.amount || 0) &&
                      /^\d+$/.test(val)) ||
                    'Invalid number of fractions'
                  );
                },
              }}
            />
          </FormRow>
          <FormRow>
            <div>
              <label>Collections</label>
              <p>A list of collections that can be nested.</p>
            </div>
            <Controller
              name="collection"
              rules={{ required: true }}
              render={({ field: { value, onChange } }) => (
                <Suggest<CollectionNestingOption>
                  components={{
                    SuggestItem: ({
                      suggestion,
                      isActive,
                    }: {
                      suggestion: CollectionNestingOption;
                      isActive?: boolean;
                    }) => (
                      <SuggestOptionNesting
                        isActive={Boolean(isActive)}
                        title={`${suggestion.name} [id ${suggestion.collection_id}]`}
                        img={suggestion.collection_cover}
                        typeAvatar="circle"
                      />
                    ),
                  }}
                  suggestions={collections}
                  isLoading={isCollectionsLoading}
                  value={value}
                  getActiveSuggestOption={(option) =>
                    option.collection_id === value.collection_id
                  }
                  getSuggestionValue={({ name }) => name}
                  onChange={(val) => {
                    resetField('token');
                    onChange(val);
                  }}
                  onSuggestionsFetchRequested={(value) =>
                    collections.filter(
                      ({ collection_id, name }) =>
                        name.toLowerCase().includes(value.toLowerCase()) ||
                        collection_id === Number(value),
                    )
                  }
                />
              )}
            />
          </FormRow>
          <FormRow>
            <div>
              <label>Parent NFT</label>
              <p>
                A token that will become the bundle owner and the root of the nested
                structure. You can provide only a token that you own.
              </p>
            </div>
            <Controller
              name="token"
              rules={{ required: true }}
              render={({ field: { value, onChange } }) => (
                <Suggest<TokenInfo>
                  components={{
                    SuggestItem: ({
                      suggestion,
                      isActive,
                    }: {
                      suggestion: TokenInfo;
                      isActive?: boolean;
                    }) => (
                      <SuggestOptionNesting
                        isActive={Boolean(isActive)}
                        title={suggestion.token_name}
                        img={suggestion.image?.fullUrl}
                        typeAvatar="square"
                      />
                    ),
                  }}
                  suggestions={tokens}
                  isLoading={isFetchingTokens}
                  value={value}
                  getActiveSuggestOption={(option) => option.token_id === value.token_id}
                  inputProps={{
                    disabled: isNotExistTokens,
                  }}
                  noSuggestMessage="No nesting tokens available"
                  getSuggestionValue={({ token_name }) => token_name}
                  onChange={onChange}
                />
              )}
            />
          </FormRow>
        </FormProvider>
      </FormWrapper>
    </Modal>
  );
};

const LabelWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: calc(var(--prop-gap) / 4);
`;

const FormRow = styled.div`
  margin-bottom: calc(var(--gap) * 1.5);
  .unique-input-text,
  .unique-suggestion-wrapper {
    width: 100%;
  }
  .unique-suggestion-wrapper {
    margin-top: var(--prop-gap);
  }
  label {
    font-weight: 500;
    display: block;
    margin-bottom: calc(var(--prop-gap) / 2);
  }

  p {
    font-size: 14px;
    color: var(--color-grey-500);
  }
`;

const AlertWrapper = styled.div`
  margin-top: var(--prop-gap);
`;
