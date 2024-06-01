import { FC, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { CreateTokenPayload } from '@unique-nft/sdk';

import { DeviceSize, useAccounts, useApi, useDeviceSize } from '@app/hooks';
import {
  Button,
  ConfirmBtn,
  Heading,
  Typography,
  useNotifications,
} from '@app/components';
import { withPageTitle } from '@app/HOCs/withPageTitle';
import { ROUTE, MY_TOKENS_TABS_ROUTE } from '@app/routes';
import { Collection } from '@app/api/graphQL/types';
import {
  useCollectionGetById,
  useCollectionGetLastTokenId,
  useCreateMultipleTokens,
  useExtrinsicCacheEntities,
  useFileUpload,
} from '@app/api';
import { sleep } from '@app/utils';

import { WrapperContent } from '../components/PageComponents';
import { CollectionSuggest } from './components/CollectionSuggest';
import { TokenList } from './components/TokenList';
import { CreateTokenDialog, NewToken, ViewMode } from './types';
import { CreateTokensDialogs } from './components/CreateTokensDialogs';
import {
  checkRequiredAttributes,
  mapTokensToPayload,
  mapTokensToPayload$1,
  scrollToTokenCard,
} from './helpers';
import { UploadFAB } from './components/UploadFAB';
import { CollectionStats } from './components/CollectionStats';
import { StatusTransactionModal } from './components/StatusTransactionModal';
import { Checkbox } from '../../components/Checkbox';
import { AttributeFilterProvider } from './contexts/AttributesFilterContext';
import { MobileFilters } from './components/MobileFilter';

export const MAX_MINT_TOKENS = 300;

export const CreateNFTv2Component: FC<{ className?: string }> = ({ className }) => {
  const [collection, setCollection] = useState<Collection>();
  const [collectionToSubmit, setCollectionToSubmit] = useState<Collection>();
  const collectionBlockRef = useRef<HTMLDivElement>(null);
  const deviceSize = useDeviceSize();

  const [tokens, setTokens] = useState<NewToken[]>([]);
  const [dialog, setDialog] = useState<CreateTokenDialog>();
  const [isLoadingSubmitResult, setIsLoadingSubmitResult] = useState<boolean>(false);

  const [stage, setStage] = useState<'uploading' | 'minting' | 'done'>('done');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [mintingProgress, setMintingProgress] = useState<number>(0);
  const [batchSize, setBatchSize] = useState<number>(30);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.grid);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const { currentChain, api } = useApi();

  const navigate = useNavigate();
  const { info, error } = useNotifications();
  const { setPayloadEntity } = useExtrinsicCacheEntities();
  const {
    selectedAccount,
    accounts: { size: accountsLength },
  } = useAccounts();
  const {
    data: lastTokenIdDto,
    isFetching: isFetchingLastTokenId,
    refetch: refetchLastTokenId,
  } = useCollectionGetLastTokenId(collection?.collection_id);
  const {
    data: collectionInfo,
    isFetching: isFetchingInfo,
    refetch: refetchCollectionInfo,
  } = useCollectionGetById(collection?.collection_id);
  const { tokenId: lastTokenId } = lastTokenIdDto || {};

  const { submitWaitResult, getFee, feeFormatted, feeLoading } =
    useCreateMultipleTokens();
  const { uploadFile } = useFileUpload();

  const leftTokens = collection?.token_limit
    ? collection.token_limit - (collection?.tokens_count || 0) - tokens.length
    : 'Unlimited';

  const selected = useMemo(() => {
    return tokens.filter(({ isSelected }) => isSelected);
  }, [tokens]);

  const handleSubmit = async () => {
    if (!collection || !selectedAccount) {
      return;
    }

    if (collection.attributes_schema) {
      const invalidToken = checkRequiredAttributes(tokens, collection.attributes_schema);
      if (invalidToken) {
        scrollToTokenCard(invalidToken.id);
        setTokens(
          tokens.map((token) => {
            if (token.id === invalidToken.id) {
              return {
                ...token,
                isValid: false,
              };
            }
            return { ...token, isValid: true };
          }),
        );
        return;
      }
    }

    setIsLoadingSubmitResult(true);
    setStage('uploading');
    const uploadedTokens: NewToken[] = [];
    try {
      for (let index = 0; index < tokens.length; index++) {
        setUploadProgress(index);
        sleep(100);
        const ipfsCid = await uploadFile(tokens[index].image.file);
        uploadedTokens.push({
          ...tokens[index],
          ipfsCid,
        });
      }
    } catch (e: any) {
      error(e.message);
    }
    setStage('minting');

    const createTokensPayload = mapTokensToPayload(
      uploadedTokens,
      collection?.collection_id,
      selectedAccount?.address,
    );

    let currentPos = 0;
    let batchSize = 30;
    const submitBatch = async (_tokens: CreateTokenPayload[]) => {
      return await submitWaitResult({
        payload: {
          tokens: _tokens,
          collectionId: collection?.collection_id,
          address: selectedAccount.address,
        },
      });
    };

    while (currentPos < createTokensPayload.length) {
      try {
        setMintingProgress(currentPos);
        await submitBatch(createTokensPayload.slice(currentPos, currentPos + batchSize));
        currentPos += batchSize;
      } catch (e) {
        batchSize = 10;
        setBatchSize(batchSize);
      }
    }
    await refetchLastTokenId();
    await refetchCollectionInfo();
    setStage('done');
    info(`${createTokensPayload.length} tokens created successfully`);
  };

  const onAddTokens = (files: File[]) => {
    const maxTokens = Math.min(
      MAX_MINT_TOKENS - tokens.length,
      leftTokens !== 'Unlimited' ? leftTokens : MAX_MINT_TOKENS,
    );
    if (files.length > maxTokens) {
      setDialog(CreateTokenDialog.exceededTokens);
      return;
    }
    const lastId =
      (tokens.sort(({ tokenId: idA }, { tokenId: idB }) => (idA > idB ? 1 : -1)).at(-1)
        ?.tokenId ||
        lastTokenId ||
        0) + 1;
    setTokens([
      ...tokens,
      ...files.map((file, index) => ({
        id: index + lastId,
        tokenId: index + lastId,
        image: {
          url: URL.createObjectURL(file),
          file,
        },
        attributes: [],
        isValid: true,
        isSelected: false,
      })),
    ]);
    info(`${files.length} files added`);
  };

  const onChangeCollection = (_collection: Collection) => {
    if (_collection === collection) {
      return;
    }
    if (!collection || tokens.length === 0) {
      setCollection(_collection);

      const rect = collectionBlockRef.current?.getBoundingClientRect();
      const top = rect?.top;
      window.scrollTo({ top, behavior: 'smooth' });
      return;
    }
    setCollectionToSubmit(_collection);
    setDialog(CreateTokenDialog.changeCollection);
  };

  const selectedAll = () => {
    setTokens(tokens.map((token) => ({ ...token, isSelected: true })));
  };

  const deselectedAll = () => {
    setTokens(tokens.map((token) => ({ ...token, isSelected: false })));
  };

  const changeSelected = (selectedTokens: NewToken[]) => {
    setTokens(
      tokens.map((token) => {
        const selectedToken = selectedTokens.find(({ id }) => id === token.id);
        return selectedToken || token;
      }),
    );
  };

  const removeSelected = () => {
    setTokens(
      tokens
        .filter(({ isSelected }) => !isSelected)
        .map((token, index) => ({ ...token, tokenId: (lastTokenId || 0) + index + 1 })),
    );
    info(`${selected.length} files removed`);
  };

  const onConfirmDialog = () => {
    if (dialog === CreateTokenDialog.removeToken) {
      removeSelected();
      setDialog(undefined);
    }
    if (dialog === CreateTokenDialog.changeCollection) {
      setCollection(collectionToSubmit);
      setDialog(undefined);
    }
  };

  useEffect(() => {
    setTokens((tokens) =>
      tokens.map((token, index) => ({
        ...token,
        tokenId: (lastTokenId || 0) + index + 1,
      })),
    );
  }, [lastTokenId]);

  const mainWrapperRef = useRef<HTMLDivElement>(null);
  const actionBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const intercept = document.createElement('div');

    intercept.setAttribute('data-observer-intercept', '');
    mainWrapperRef.current?.after(intercept);

    const observer = new IntersectionObserver(([entry]) => {
      actionBoxRef.current?.classList.toggle('active', !entry.isIntersecting);
    });

    observer.observe(intercept);
  }, []);

  const onChangeView = (viewMode: ViewMode) => () => {
    setViewMode(viewMode);
  };

  return (
    <AttributeFilterProvider>
      <MainWrapper className="create-nft-page" ref={mainWrapperRef}>
        <WrapperCollectionContentStyled expanded={!!collection}>
          <Heading size="3">Choose a collection</Heading>
          <CollectionBlock ref={collectionBlockRef}>
            <CollectionSuggest collection={collection} onChange={onChangeCollection} />
            {collection && (
              <CollectionStats
                collection={collection}
                isFetching={isFetchingInfo || isFetchingLastTokenId}
                nestingPermissions={collectionInfo?.permissions?.nesting}
                sponsorship={collectionInfo?.sponsorship}
                tokensLeft={leftTokens}
                tokensLimit={collection.token_limit}
                lastTokenId={lastTokenId || 0}
              />
            )}
          </CollectionBlock>
        </WrapperCollectionContentStyled>
        <WrapperTokenListContentStyled disabled={!collection}>
          <Heading size="3">Create tokens</Heading>
          <Typography size="m" color="grey-500">
            You can mass-mint {MAX_MINT_TOKENS} tokens using JPEG, PNG, and GIF files,
            with a maximum size of 10MB each
          </Typography>
          {tokens.length > 0 && (
            <TokensCounterWrapper>
              <Typography color="grey-500" weight="bold" size="m">
                {tokens.length} / {MAX_MINT_TOKENS}
              </Typography>
              <Button
                title=""
                role="ghost"
                iconLeft={{
                  color:
                    viewMode === ViewMode.grid
                      ? 'var(--color-primary-500)'
                      : 'currentColor',
                  name: 'grid',
                  size: 32,
                }}
                onClick={onChangeView(ViewMode.grid)}
              />
              <Button
                title=""
                role="ghost"
                iconLeft={{
                  color:
                    viewMode === ViewMode.list
                      ? 'var(--color-primary-500)'
                      : 'currentColor',
                  name: 'list',
                  size: 32,
                }}
                onClick={onChangeView(ViewMode.list)}
              />
            </TokensCounterWrapper>
          )}
          <TokenList
            viewMode={viewMode}
            tokenPrefix={collection?.token_prefix || ''}
            attributesSchema={collection?.attributes_schema || []}
            mode={collection?.mode}
            tokensLimit={collection?.token_limit}
            tokensStartId={lastTokenId}
            tokens={tokens}
            disabled={!collection}
            onChange={setTokens}
            onAddTokens={onAddTokens}
          />
          {tokens.length > 0 && !isFilterVisible && (
            <ButtonGroup ref={actionBoxRef}>
              <Button
                title={
                  <StyledCheckbox
                    label={
                      <Typography color="grey-500">
                        {selected.length ? `${selected.length} selected` : 'Select all'}
                      </Typography>
                    }
                    checked={selected.length > 0}
                    onChange={(value) => {
                      if (value) {
                        selectedAll();
                        return;
                      }
                      deselectedAll();
                    }}
                  />
                }
                onClick={() => {
                  if (selected.length > 0) {
                    deselectedAll();
                    return;
                  }
                  selectedAll();
                }}
              />
              {deviceSize <= DeviceSize.sm && (
                <ConfirmBtn
                  role="outlined"
                  title="Filter"
                  onClick={() => setIsFilterVisible(true)}
                />
              )}
              <ConfirmBtn
                className={selected.length > 0 ? 'visible' : 'hidden'}
                role="outlined"
                disabled={selected.length === 0}
                title="Modify selected"
                onClick={() => setDialog(CreateTokenDialog.editAttributes)}
              />
              <ConfirmBtn
                className={selected.length > 0 ? 'visible' : 'hidden'}
                role="danger"
                disabled={selected.length === 0}
                title="Remove selected"
                onClick={() => setDialog(CreateTokenDialog.removeToken)}
              />
              <SelectedCountWrapper />
              <ConfirmBtn
                disabled={!collection || tokens.length === 0}
                role="primary"
                title="Confirm and create all"
                onClick={handleSubmit}
              />
              {tokens.length > 0 && leftTokens > 0 && (
                <UploadFAB onUpload={onAddTokens} />
              )}
            </ButtonGroup>
          )}
        </WrapperTokenListContentStyled>

        <CreateTokensDialogs
          dialog={dialog}
          tokens={selected}
          tokenPrefix={collection?.token_prefix || ''}
          leftTokens={leftTokens}
          attributesSchema={collection?.attributes_schema}
          mode={collection?.mode}
          onClose={() => setDialog(undefined)}
          onChange={changeSelected}
          onConfirm={onConfirmDialog}
        />
        <StatusTransactionModal
          title={stage === 'done' ? 'Tokens successfully created' : 'Please wait'}
          isVisible={true && isLoadingSubmitResult}
          stage={stage}
          uploadingProgress={uploadProgress}
          mintingProgress={mintingProgress}
          totalTokens={tokens.length}
          batchSize={batchSize}
          onComplete={() => {
            navigate(
              `/${currentChain?.network}/${ROUTE.MY_TOKENS}/${MY_TOKENS_TABS_ROUTE.NFT}`,
            );
          }}
          onContinue={() => {
            setTokens([]);
            setUploadProgress(0);
            setMintingProgress(0);
            setIsLoadingSubmitResult(false);
            setStage('uploading');
          }}
        />
        <MobileFilters isVisible={isFilterVisible} setIsVisible={setIsFilterVisible} />
      </MainWrapper>
    </AttributeFilterProvider>
  );
};

export const MainWrapper = styled.div`
  @media screen and (min-width: 1025px) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .unique-modal-content-wrapper {
    max-width: fit-content;
    width: auto;
  }
`;

const CollectionBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--prop-gap);
  align-items: flex-start;
  max-width: 1000px;
  @media screen and (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const WrapperCollectionContentStyled = styled(WrapperContent)<{ expanded: boolean }>`
  margin-bottom: calc(var(--prop-gap) * 2.5);
  width: 100%;
  max-height: ${({ expanded }) => (expanded ? '1000px' : '154px')};
  transition: 0.5s;
  @media screen and (min-width: 1025px) {
    margin-bottom: 0;
  }
`;

const WrapperTokenListContentStyled = styled(WrapperContent)<{ disabled: boolean }>`
  margin: calc(var(--prop-gap) * 2) 0;
  width: 100%;
  opacity: ${({ disabled }) => (disabled ? '0.7' : '1')};
  position: relative;
  transition: 0.5s;
  h3.unique-font-heading.size-3 {
    margin-bottom: 0;
  }
  @media screen and (min-width: 1025px) {
    margin-bottom: 0;
  }
`;

const TokensCounterWrapper = styled.div`
  position: absolute;
  right: 32px;
  top: 32px;
  display: flex;
  align-items: center;
  gap: var(--gap);

  button.unique-button.ghost {
    padding: 0;
    svg {
      margin: 0;
    }
  }

  @media screen and (max-width: 1024px) {
    top: 0px;
    right: 0px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--prop-gap);
  box-sizing: border-box;
  padding: calc(var(--prop-gap) * 2);
  margin: -32px;
  bottom: 0px;
  z-index: 1001;
  background: white;
  position: sticky;
  border-radius: 4px;
  &.active {
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
  }
  button {
    transition: 0.2s;
    &.visible {
      visibility: visible;
      opacity: 1;
    }
    &.hidden {
      visibility: hidden;
      opacity: 0;
    }
  }
  @media screen and (max-width: 768px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    & > button:last-of-type {
      grid-column: 1 / span 2;
    }
  }
  @media screen and (max-width: 568px) {
    gap: calc(var(--prop-gap) / 2);
    & > button.unique-button.size-middle {
      padding: 8px 16px;
    }
  }
`;

const SelectedCountWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
`;

const SelectCheckbox = styled(Checkbox)`
  align-items: center;
  &.unique-checkbox-wrapper.checkbox-size-s span.checkmark {
    height: 32px;
    width: 32px;
    border-radius: var(--prop-gap);
    background-color: var(--color-primary-300);
    &.checked {
      background-color: var(--color-primary-500);
    }
  }
  label.checkbox-label {
    margin-left: 42px;
  }
`;

const StyledCheckbox = styled(Checkbox)`
  align-items: center;
  margin-left: -14px;
  label.checkbox-label {
    margin-left: 42px;
  }
`;

export const CreateNFTv2 = withPageTitle({
  backLink: `${ROUTE.MY_TOKENS}/${MY_TOKENS_TABS_ROUTE.NFT}`,
})(CreateNFTv2Component);
