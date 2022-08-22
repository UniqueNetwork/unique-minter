import { useEffect, useMemo, useState, VFC } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNotifications } from '@unique-nft/ui-kit';
import { useDebounce } from 'use-debounce';
import styled from 'styled-components';
import classNames from 'classnames';

import { useGraphQlCollectionsByAccount } from '@app/api/graphQL/collections';
import { TokenApiService, useExtrinsicFee, useExtrinsicFlow } from '@app/api';
import { useCollectionQuery } from '@app/api/restApi/collection/hooks/useCollectionQuery';
import { Alert, MintingBtn, StatusTransactionModal } from '@app/components';
import { usePageSettingContext } from '@app/context';
import { useAccounts, useApi, useBalanceInsufficient } from '@app/hooks';
import { NO_BALANCE_MESSAGE } from '@app/pages';
import { ButtonGroup, FormWrapper } from '@app/pages/components/FormComponents';
import { MainWrapper, WrapperContent } from '@app/pages/components/PageComponents';
import { Sidebar } from '@app/pages/CreateNFT/Sidebar';
import { ROUTE } from '@app/routes';
import { getTokenIpfsUriByImagePath } from '@app/utils';
import { logUserEvent, UserEvents } from '@app/utils/logUserEvent';
import { FeeInformationTransaction } from '@app/components/FeeInformationTransaction';

import { CreateNftForm } from './CreateNftForm';
import { useTokenFormMapper } from './useTokenFormMapper';
import { AttributeView, Option, TokenForm, FilledTokenForm } from './types';

interface ICreateNFTProps {
  className?: string;
}

const defaultOptions = {
  skip: false,
  pagination: {
    page: 0,
    limit: 300,
  },
};

export const CreateNFTComponent: VFC<ICreateNFTProps> = ({ className }) => {
  const [closable, setClosable] = useState(false);
  const { setPageBreadcrumbs, setPageHeading } = usePageSettingContext();

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { currentChain } = useApi();
  const { selectedAccount } = useAccounts();
  const { error, info } = useNotifications();
  const mapper = useTokenFormMapper();

  const { getFee, fee, feeFormatted, feeError, isFeeError } = useExtrinsicFee(
    TokenApiService.tokenCreateMutation,
  );
  const { flowStatus, flowError, isFlowLoading, signAndSubmitExtrinsic } =
    useExtrinsicFlow(TokenApiService.tokenCreateMutation);

  const { isBalanceInsufficient } = useBalanceInsufficient(selectedAccount?.address, fee);

  const collectionId = params.get('collectionId');

  const tokenForm = useForm<TokenForm>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      owner: selectedAccount?.address,
      address: selectedAccount?.address,
      collectionId: collectionId ? Number(collectionId) : null,
    },
  });

  const {
    control,
    reset,
    formState: { isValid },
  } = tokenForm;

  const formValues = useWatch({ control });
  const [debouncedFormValues] = useDebounce(formValues, 500);
  const { collections, isCollectionsLoading } = useGraphQlCollectionsByAccount({
    accountAddress: selectedAccount?.address,
    options: defaultOptions,
  });
  const { data: collection } = useCollectionQuery(formValues.collectionId ?? 0);

  const tokenAttributes: AttributeView[] | undefined = useMemo(() => {
    const attrsSchema = collection?.schema?.attributesSchema;
    const formAttrs = formValues.attributes;

    if (!attrsSchema || !formAttrs?.length) {
      return [];
    }

    const attrs: AttributeView[] = [];

    for (let i = 0; i < formAttrs.length; i++) {
      let values: string[] = [];
      const attr = formAttrs[i];

      if (!attr) {
        continue;
      }

      if (Array.isArray(attr)) {
        values = attr.map((val) => val.title || '');
      } else if (typeof attr === 'string') {
        values = [attr];
      } else if (typeof attr === 'object') {
        values = [attr.title || ''];
      }

      attrs.push({ values, group: attrsSchema[i].name._ });
    }

    return attrs;
  }, [collection, formValues]);

  const collectionsOptions = useMemo(
    () =>
      collections?.map<Option>((collection) => ({
        id: collection.collection_id,
        title: collection.name,
        description: collection.description,
        img: getTokenIpfsUriByImagePath(collection.collection_cover),
      })) ?? [],
    [collections],
  );

  useEffect(() => {
    setPageBreadcrumbs({ options: [] });
    setPageHeading('Create a NFT');
  }, []);

  useEffect(() => {
    const { address, collectionId } = debouncedFormValues;

    if (collectionId && address && isValid) {
      getFee({ token: mapper(debouncedFormValues as FilledTokenForm) });
    }
  }, [debouncedFormValues]);

  useEffect(() => {
    if (flowStatus === 'success') {
      info('NFT created successfully');

      closable
        ? navigate(`/${currentChain?.network}/${ROUTE.MY_TOKENS}`)
        : reset(undefined, { keepDefaultValues: true });
    }

    if (flowStatus === 'error') {
      error(flowError?.message);
    }
  }, [flowStatus]);

  useEffect(() => {
    if (isFeeError) {
      error(feeError?.message);
    }
  }, [isFeeError]);

  const confirmFormHandler = (closable?: boolean) => {
    const { address, collectionId } = debouncedFormValues;

    if (address && collectionId && isValid) {
      logUserEvent(closable ? UserEvents.CONFIRM_CLOSE : UserEvents.CONFIRM_MORE);

      setClosable(!!closable);

      signAndSubmitExtrinsic({
        token: mapper(debouncedFormValues as FilledTokenForm),
      });
    }
  };

  const isolatedTokenForm = useMemo(
    () => (
      <FormProvider {...tokenForm}>
        <CreateNftForm
          selectedCollection={collection}
          collectionsOptions={collectionsOptions}
          collectionsOptionsLoading={isCollectionsLoading}
        />
      </FormProvider>
    ),
    [collection, collectionsOptions, isCollectionsLoading, tokenForm],
  );

  return (
    <>
      <MainWrapper className={classNames('create-nft-page', className)}>
        <WrapperContent>
          <FormWrapper>
            {isolatedTokenForm}
            {feeFormatted && isValid ? (
              <FeeInformationTransaction className="alert" fee={feeFormatted} />
            ) : (
              <Alert className="alert" type="warning">
                A fee will be calculated after corrected filling required fields
              </Alert>
            )}

            <ButtonGroup className="buttons">
              <MintingBtn
                role="primary"
                title="Confirm and create more"
                tooltip={isBalanceInsufficient ? NO_BALANCE_MESSAGE : undefined}
                disabled={!isValid || isBalanceInsufficient}
                onClick={() => confirmFormHandler()}
              />
              <MintingBtn
                title="Confirm and close"
                tooltip={isBalanceInsufficient ? NO_BALANCE_MESSAGE : undefined}
                disabled={!isValid || isBalanceInsufficient}
                onClick={() => confirmFormHandler(true)}
              />
            </ButtonGroup>
          </FormWrapper>
        </WrapperContent>
        <Sidebar
          hidden={!collection}
          collectionName={collection?.name}
          collectionDescription={collection?.description}
          collectionCoverUrl={collection?.schema?.coverPicture.fullUrl}
          tokenPrefix={collection?.tokenPrefix}
          tokenImageUrl={getTokenIpfsUriByImagePath(formValues?.imageIpfsCid)}
          attributes={tokenAttributes}
        />
      </MainWrapper>
      <StatusTransactionModal isVisible={isFlowLoading} description="Creating NFT" />
    </>
  );
};

export const CreateNFT = styled(CreateNFTComponent)`
  .alert {
    margin-top: 32px;
  }

  .buttons {
    margin-top: 32px;
  }
`;
