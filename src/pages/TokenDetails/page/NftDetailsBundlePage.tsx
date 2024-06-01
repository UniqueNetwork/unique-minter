import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { TokenByIdResponse } from '@unique-nft/sdk';
import { Address } from '@unique-nft/utils';

import { TokenDetailsLayout } from '@app/pages/TokenDetails/components/TokenDetailsLayout';
import { TokenDetailsCard } from '@app/pages/TokenDetails/components/TokenDetailsCard';
import { NFTModals, TTokenModalType } from '@app/pages/TokenDetails/Modals';
import {
  useTokenGetBalance,
  useTokenGetBundle,
  useTokenGetById,
  useTokenGetTotalPieces,
} from '@app/api';
import BundleTree from '@app/components/BundleTree/BundleTree';
import NodeView from '@app/components/BundleTree/Node/NodeView';
import { INestingToken } from '@app/components/BundleTree/types';
import { NestedSection } from '@app/components/BundleTree/NestedSection/NestedSection';
import { DeviceSize, useApi, useDeviceSize } from '@app/hooks';
import { useIsOwner } from '@app/pages/TokenDetails/hooks/useIsOwner';
import { countNestedChildren } from '@app/components/BundleTree/helpers-bundle';
import { Achievement, Button, TransferBtn, Heading, Typography } from '@app/components';
import { logUserEvent, UserEvents } from '@app/utils/logUserEvent';
import { BottomBar, BottomBarHeader } from '@app/pages/components/BottomBar';
import AccountCard from '@app/pages/Accounts/components/AccountCard';
import { useGetTokenPath } from '@app/hooks/useGetTokenPath';
import {
  AngelHackBaseCollectionId,
  AngelHackWearablesCollectionId,
} from '@app/pages/MyTokens/constants';

const areNodesEqual = (a: INestingToken, b: INestingToken) =>
  a.collectionId === b.collectionId && a.tokenId === b.tokenId;

const getKey = (a: INestingToken) => `T${a.tokenId}C${a.collectionId}`;

export const NftDetailsBundlePage = () => {
  const { collectionId = '', tokenId = '', address = '' } = useParams();
  const navigate = useNavigate();
  const { currentChain } = useApi();
  const deviceSize = useDeviceSize();
  const getTokenPath = useGetTokenPath();

  const [bundle, setBundle] = useState<INestingToken[]>([]);
  const parentBundle = Address.is.nestingAddress(address)
    ? Address.nesting.addressToIds(address)
    : undefined;

  const [currentModal, setCurrentModal] = useState<TTokenModalType>('none');

  const [isShowBundleTreeMobile, setShowBundleTreeMobile] = useState(false);

  const [selectedTokenBundleTable, setSelectedTokenBundleTable] =
    useState<INestingToken | null>(null);

  const [selectedToken, setSelectedToken] = useState<INestingToken>();

  const { bundleToken, isLoadingBundleToken, refetchBundle } = useTokenGetBundle({
    collectionId: parentBundle?.collectionId || parseInt(collectionId),
    tokenId: parentBundle?.tokenId || parseInt(tokenId),
  });

  const {
    data: tokenById,
    isLoading: isLoadingToken,
    refetch: refetchToken,
  } = useTokenGetById({
    collectionId: parseInt(collectionId),
    tokenId: parseInt(tokenId),
  });

  const { data: parentToken, isLoading: isLoadingParentToken } = useTokenGetById({
    ...(parentBundle || tokenById?.nestingParentToken),
  });

  const token:
    | (TokenByIdResponse & {
        collectionName: string;
        name: string;
      })
    | undefined = useMemo(() => {
    if (!tokenById) {
      return undefined;
    }

    const tokenWithNames = {
      ...tokenById,
      name: `${tokenById?.collection.tokenPrefix} #${tokenById.tokenId}`,
      collectionName: tokenById?.collection.name || '',
    };

    if (parentToken) {
      return {
        ...tokenWithNames,
        nestingParentToken: {
          collectionId: parentToken.collectionId,
          tokenId: parentToken.tokenId,
        },
      };
    }

    return tokenWithNames;
  }, [tokenById, parentToken]);

  const isFractional = token?.collection.mode === 'ReFungible';

  const { data: pieces, refetch: refetchTotalPieces } = useTokenGetTotalPieces({
    tokenId: parseInt(tokenId),
    collectionId: parseInt(collectionId),
  });

  const { data: balance, refetch: refetchTokenBalance } = useTokenGetBalance({
    tokenId: parseInt(tokenId),
    collectionId: parseInt(collectionId),
    address,
    isFractional,
  });

  const isOwner = useIsOwner(token, address);

  const onModalClose = () => {
    setCurrentModal('none');
    setSelectedTokenBundleTable(null);
  };

  const onComplete = async () => {
    await refetchToken();
    await refetchBundle();
    if (isFractional) {
      await refetchTokenBalance();
      await refetchTotalPieces();
    }
    setCurrentModal('none');
  };

  const handleNodeClicked = (data: INestingToken) => {
    console.log(data);
  };

  const handleViewTokenDetails = (gotoToken: INestingToken) => {
    if (gotoToken.nestingParentToken) {
      const parentAddress = Address.nesting.idsToAddress(
        gotoToken.nestingParentToken.collectionId,
        gotoToken.nestingParentToken.tokenId,
      );
      navigate(getTokenPath(parentAddress, gotoToken.collectionId, gotoToken.tokenId), {
        state: {
          backLink: getTokenPath(
            gotoToken.nestingParentOwner,
            gotoToken.nestingParentToken.collectionId,
            gotoToken.nestingParentToken.tokenId,
          ),
        },
      });
      return;
    }
    navigate(getTokenPath(gotoToken.owner, gotoToken.collectionId, gotoToken.tokenId));
  };

  const isBundleToken = () => {
    // @ts-ignore
    const nestingParentToken = bundleToken?.nestingChildTokens?.[0]?.nestingParentToken;

    if (!nestingParentToken) {
      return false;
    }

    return (
      nestingParentToken.collectionId === parseInt(collectionId) &&
      nestingParentToken.tokenId === parseInt(tokenId)
    );
  };

  useEffect(() => {
    setBundle([]);
  }, [bundleToken]);

  useEffect(() => {
    if (bundle.length) {
      return;
    }

    const sortTokensInBundleAndSelectOpened = (bundle: INestingToken) => {
      bundle.isCurrentAccountOwner = isOwner;

      if (
        bundle.tokenId === token?.tokenId &&
        bundle.collectionId === token.collectionId &&
        bundle.nestingParentToken?.collectionId === parentBundle?.collectionId &&
        bundle.nestingParentToken?.tokenId === parentBundle?.tokenId
      ) {
        bundle.selected = true;
        bundle.opened = true;
        setSelectedToken(bundle);
      }

      if (!bundle.nestingChildTokens?.length) {
        return bundle;
      }

      bundle.nestingChildTokens = bundle.nestingChildTokens
        ?.sort((a, b) => (a.tokenId > b.tokenId ? 1 : -1))
        .map((token) => sortTokensInBundleAndSelectOpened(token));
      return bundle;
    };

    const openNodeIfChildsPageOpened = (bundle: INestingToken) => {
      if (!bundle.nestingChildTokens?.length) {
        return (
          bundle.tokenId === token?.tokenId &&
          bundle.collectionId === token.collectionId &&
          bundle.nestingParentToken?.collectionId === parentBundle?.collectionId &&
          bundle.nestingParentToken?.tokenId === parentBundle?.tokenId
        );
      }

      bundle.opened = !!bundle.nestingChildTokens.filter((token) =>
        openNodeIfChildsPageOpened(token),
      ).length;
      return bundle;
    };

    if (bundleToken && !isLoadingBundleToken) {
      let allowedToEditBundle = JSON.parse(JSON.stringify(bundleToken));

      setSelectedToken(allowedToEditBundle);

      allowedToEditBundle = sortTokensInBundleAndSelectOpened(allowedToEditBundle);
      allowedToEditBundle = openNodeIfChildsPageOpened(allowedToEditBundle);
      setBundle([allowedToEditBundle]);
    }
  }, [
    bundle,
    bundleToken,
    isLoadingBundleToken,
    token?.tokenId,
    token?.collectionId,
    parentBundle?.collectionId,
    parentBundle?.tokenId,
    isOwner,
  ]);

  const tokensCount = useMemo(() => {
    if (!bundle || !bundle[0]?.nestingChildTokens) {
      return 0;
    }
    return countNestedChildren(bundle[0].nestingChildTokens);
  }, [bundle]);

  const handleUnnestToken = (token: INestingToken) => {
    unnestTokenAction(token);
    setSelectedTokenBundleTable(token);
  };

  const unnestTokenAction = (_token?: INestingToken) => {
    logUserEvent(UserEvents.UNNEST_TOKEN);

    const isTokenFractional = _token ? _token.isFractional : isFractional;

    setCurrentModal(isTokenFractional ? 'unnest-refungible' : 'unnest');
  };

  const handleTransferToken = (token: INestingToken) => {
    transferTokenAction(token);
    setSelectedTokenBundleTable(token);
  };

  const transferTokenAction = (_token?: INestingToken) => {
    logUserEvent(UserEvents.TRANSFER_NFT);

    const isTokenFractional = _token ? _token.isFractional : isFractional;

    setCurrentModal(isTokenFractional ? 'transfer-refungible' : 'bundle-transfer');
  };

  const BundleTreeRendered = (
    <BundleTree<INestingToken>
      dataSource={bundle}
      selectedToken={selectedToken}
      nodeView={NodeView}
      nestedSectionView={NestedSection}
      className="tree-container"
      compareNodes={areNodesEqual}
      childrenProperty="nestingChildTokens"
      getKey={getKey}
      hideTreeView={
        tokenById?.collectionId === AngelHackBaseCollectionId[currentChain.network]
      }
      onNodeClicked={handleNodeClicked}
      onViewNodeDetails={handleViewTokenDetails}
      onUnnestClick={handleUnnestToken}
      onTransferClick={handleTransferToken}
    />
  );

  const owner = () => {
    const isBundle = isBundleToken();

    if (!isOwner && isBundle) {
      return (
        <>
          Owned by{' '}
          <AccountCard
            accountAddress={token?.owner || ''}
            canCopy={false}
            scanLink={`${currentChain.uniquescanAddress}/account/${token?.owner}`}
          />
        </>
      );
    }
    if (isOwner && isBundle) {
      return 'You own it';
    }
    if (!parentToken) {
      return null;
    }

    const parentOwnerEthAddress = Address.is.ethereumAddress(parentToken?.owner || '')
      ? parentToken?.owner
      : Address.mirror.substrateToEthereum(parentToken?.owner || '');

    return (
      <>
        Nested in bundle
        <TokenLink
          to={`/${currentChain?.network}/token/${parentOwnerEthAddress}/${parentToken?.collectionId}/${parentToken?.tokenId}`}
        >
          {parentToken?.collection.tokenPrefix} #{parentToken?.tokenId}
        </TokenLink>
      </>
    );
  };

  const renderAchievements = () => (
    <AchievementsWrapper>
      {tokenById?.collectionId === AngelHackBaseCollectionId[currentChain.network] && (
        <Achievement achievement="Soulbound" tooltipDescription={null} />
      )}
      {tokenById?.collectionId ===
        AngelHackWearablesCollectionId[currentChain.network] && (
        <Achievement achievement="Wearables" tooltipDescription={null} />
      )}
      <Achievement
        achievement={isBundleToken() ? 'Bundle' : 'Nested'}
        tooltipDescription={
          <>
            A&nbsp;group of&nbsp;tokens nested in&nbsp;an&nbsp;NFT and having
            a&nbsp;nested, ordered, tree-like structure
          </>
        }
      />
      {isFractional && (
        <Achievement
          achievement="Fractional"
          tooltipDescription={
            <>
              A&nbsp;fractional token provides a&nbsp;way for many users to&nbsp;own
              a&nbsp;part of&nbsp;an&nbsp;NFT
            </>
          }
        />
      )}
    </AchievementsWrapper>
  );

  return (
    <NftDetailsWrapper>
      <TokenDetailsLayout
        isLoading={isLoadingBundleToken || isLoadingToken || isLoadingParentToken}
        tokenExist={!!bundleToken && !!token}
      >
        <TokenDetailsCard<TokenByIdResponse & { collectionName: string; name: string }>
          className="nft-details-card"
          token={token}
          owner={owner()}
          achievement={renderAchievements()}
          isFractional={isFractional}
          balance={balance?.amount}
          pieces={pieces?.amount}
          canBurn={isOwner && (selectedToken?.nestingChildTokens?.length || 0) === 0}
          burnModal={isFractional ? 'burn-refungible' : 'burn'}
          buttons={
            isOwner &&
            token?.collection.limits?.transfersEnabled !== false && (
              <>
                <TransferBtn
                  wide={deviceSize === DeviceSize.xs}
                  title="Transfer"
                  role="primary"
                  onClick={() => transferTokenAction()}
                />
                {!isBundleToken() && (
                  <TransferBtn
                    wide={deviceSize === DeviceSize.xs}
                    title="Unnest Token"
                    role="danger"
                    onClick={() => unnestTokenAction()}
                  />
                )}
                {isBundleToken() && (
                  <Button
                    title="Nest this token"
                    wide={deviceSize === DeviceSize.xs}
                    onClick={() => {
                      logUserEvent(UserEvents.CREATE_BUNDLE);
                      setCurrentModal(isFractional ? 'nest-refungible' : 'create-bundle');
                    }}
                  />
                )}
              </>
            )
          }
          onCurrentModal={setCurrentModal}
        />

        {deviceSize >= DeviceSize.sm && (
          <BundleWrapper>
            <HeaderStyled>
              <Heading size="2">Bundle structure</Heading>
              <Typography color="grey-500" size="m" className="tokens-count">
                {tokensCount + 1} items total
              </Typography>
            </HeaderStyled>
            {BundleTreeRendered}
          </BundleWrapper>
        )}

        {deviceSize <= DeviceSize.xs && (
          <BottomBar
            buttons={[
              <Button
                key="show-bundle-tree"
                role="primary"
                wide={deviceSize === DeviceSize.xs}
                iconLeft={
                  isShowBundleTreeMobile
                    ? {
                        color: 'currentColor',
                        name: 'arrow-left',
                        size: 16,
                      }
                    : undefined
                }
                title={isShowBundleTreeMobile ? 'Back' : 'Show bundle structure'}
                onClick={() => setShowBundleTreeMobile((prev) => !prev)}
              />,
            ]}
            header={
              <BottomBarHeader showBackLink={false} title="Bundle structure">
                <Typography color="grey-500" size="m" className="tokens-count">
                  {tokensCount + 1} items total
                </Typography>
              </BottomBarHeader>
            }
            isOpen={isShowBundleTreeMobile}
            parent={document.body}
          >
            {BundleTreeRendered}
          </BottomBar>
        )}

        <NFTModals<
          | INestingToken
          | (TokenByIdResponse & {
              collectionName: string;
              name: string;
            })
        >
          modalType={currentModal}
          token={selectedTokenBundleTable || token}
          onComplete={onComplete}
          onClose={onModalClose}
        />
      </TokenDetailsLayout>
    </NftDetailsWrapper>
  );
};

const TokenLink = styled(Link)`
  color: var(--color-primary-500);

  &:hover {
    text-decoration: underline;
  }
`;

const BundleWrapper = styled.div`
  margin-top: calc(var(--prop-gap) * 1.5);

  @media screen and (max-width: 567px) {
    display: none;
  }
`;

const HeaderStyled = styled.div`
  display: flex;
  gap: var(--gap);

  .tokens-count {
    margin-top: 12px;
    font-weight: normal;
    display: block;
  }
`;

const NftDetailsWrapper = styled.div`
  display: flex;
  flex: 1;
`;

const AchievementsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: calc(var(--prop-gap) / 2);
  align-items: flex-end;
  position: absolute;
  width: 100%;
  span {
    position: relative;
  }
`;
