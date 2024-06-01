import React, { useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider } from 'react-hook-form';
import styled from 'styled-components';
import { Address } from '@unique-nft/utils';
import { useNavigate } from 'react-router-dom';
import {
  TransferRefungibleTokenParsed,
  TransferRefungibleTokenRequest,
} from '@unique-nft/sdk';

import { useAccounts } from '@app/hooks';
import {
  CollectionNestingOption,
  useTokenGetBalance,
  useTokenRefungibleTransfer,
} from '@app/api';
import { TBaseToken } from '@app/pages/TokenDetails/type';
import {
  Loader,
  Typography,
  Modal,
  TransferBtn,
  useNotifications,
} from '@app/components';
import { Suggest } from '@app/components/Suggest';
import {
  useGraphQlCollectionsByNestingAccount,
  useGraphQlGetCollectionsByIds,
} from '@app/api/graphQL/collections';
import { useGetTokenPath } from '@app/hooks/useGetTokenPath';
import { formatBlockNumber } from '@app/utils';
import {
  TokenInfo,
  useAllOwnedTokensByCollection,
} from '@app/pages/TokenDetails/hooks/useAllOwnedTokensByCollection';
import { useTransactionFormService } from '@app/hooks/useTransactionModalService';

import { SuggestOptionNesting } from '../CreateBundleModal/components';
import { FormWrapper, InputAmount } from '../Transfer';
import { TokenModalsProps } from '../NFTModals';
import { NestRefungibleFormDataType } from './types';
import { NestRefungibleStagesModal } from './NestRefungibleStagesModal';
import { NOT_ENOUGH_BALANCE_MESSAGE } from '../constants';

export const NestRefungibleModal = <T extends TBaseToken>({
  token,
  onClose,
  onComplete,
}: TokenModalsProps<T>) => {
  const { selectedAccount } = useAccounts();
  const { info } = useNotifications();
  const getTokenPath = useGetTokenPath();
  const navigate = useNavigate();
  const [isWaitingComplete, setIsWaitingComplete] = useState(false);

  const {
    form,
    formData,
    submitWaitResult,
    getFee,
    feeFormatted,
    feeLoading,
    debouncedFormValues,
    isSufficientBalance,
  } = useTransactionFormService<
    TransferRefungibleTokenParsed,
    TransferRefungibleTokenRequest,
    NestRefungibleFormDataType
  >({
    MutateAsyncFunction: useTokenRefungibleTransfer,
    account: selectedAccount,
    defaultValues: {
      amount: 1,
    },
  });

  const { formState, handleSubmit, resetField } = form;

  const { data: fractionsBalance, isFetching: isFetchingBalance } = useTokenGetBalance({
    collectionId: token?.collectionId,
    tokenId: token?.tokenId,
    address: selectedAccount?.address,
    isFractional: true,
  });

  const { collectionsIds, isCollectionsLoading } = useGraphQlCollectionsByNestingAccount({
    accountAddress: selectedAccount?.address,
  });

  const {
    synchronizedCollections,
    isSynchronizedCollectionsLoading,
    refetchCollectionsByIds,
  } = useGraphQlGetCollectionsByIds({
    collections:
      collectionsIds?.map(({ collection_id }) => ({
        collectionId: collection_id,
      })) || [],
  });

  useEffect(() => {
    refetchCollectionsByIds();
  }, [collectionsIds]);

  const { tokens, isFetchingTokens } = useAllOwnedTokensByCollection(
    formData?.collection?.collection_id,
    {
      excludeTokenId:
        formData?.collection?.collection_id === token?.collectionId
          ? token?.tokenId
          : undefined,
    },
  );

  useEffect(() => {
    const { amount, collection, token: parentToken } = debouncedFormValues;
    const parentCollectionId = collection?.collection_id;
    const parentTokenId = parentToken?.token_id;

    if (
      !formState.isValid ||
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
      from: selectedAccount.address,
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
          from: selectedAccount.address,
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

  const validationMessage = useMemo(() => {
    if (!form.formState.isValid) {
      return 'Please enter a valid number of fractions and choosing parent NFT';
    }
    if (!isSufficientBalance) {
      return `${NOT_ENOUGH_BALANCE_MESSAGE} ${selectedAccount?.unitBalance || 'coins'}`;
    }
    return null;
  }, [form.formState, isSufficientBalance, selectedAccount]);

  const isNotExistTokens = tokens.length === 0;

  if (!selectedAccount || !token) {
    return null;
  }

  if (isWaitingComplete) {
    return <NestRefungibleStagesModal />;
  }

  return (
    <Modal
      isVisible={true}
      title="Nest fractional token"
      footerButtons={
        <TransferBtn
          title="Confirm"
          disabled={!formState.isValid || !isSufficientBalance}
          role="primary"
          tooltip={validationMessage}
          onClick={handleSubmit(nestHandler)}
        />
      }
      onClose={onClose}
    >
      {isFetchingBalance && <Loader isFullPage={true} />}
      <FormWrapper
        fee={formState.isValid && feeFormatted && !feeLoading ? feeFormatted : undefined}
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
                        <Typography
                          size="s"
                          color="grey-500"
                        >{`You own: ${formatBlockNumber(
                          fractionsBalance?.amount || 0,
                        )}`}</Typography>
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
                  suggestions={synchronizedCollections || []}
                  isLoading={isCollectionsLoading || isSynchronizedCollectionsLoading}
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
                    synchronizedCollections.filter(
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
