import { title } from 'process';

import React, { useCallback, useContext, useState, VFC } from 'react';
import classNames from 'classnames';
import styled from 'styled-components';
import { Avatar, Loader } from '@unique-nft/ui-kit';
import { useSearchParams } from 'react-router-dom';

import { PagePaper } from '@app/components';
import { getTokenIpfsUriByImagePath } from '@app/utils';
import AccountContext from '@app/account/AccountContext';
import { useGraphQlTokenById } from '@app/api/graphQL/tokens';

import {
  CollectionInformation,
  Divider,
  NFTDetailsHeader,
  TokenInformation,
} from './components';

interface NFTDetailsProps {
  className?: string;
}

const NFTDetailsComponent: VFC<NFTDetailsProps> = ({ className }) => {
  const { selectedAccount } = useContext(AccountContext);
  const [searchParams] = useSearchParams();

  const tokenId = parseInt(searchParams.get('tokenId') ?? '');
  const collectionId = parseInt(searchParams.get('collectionId') ?? '');

  const { token, loading } = useGraphQlTokenById(tokenId, collectionId);

  const avatar = getTokenIpfsUriByImagePath(token?.image_path ?? '');
  const owner =
    selectedAccount?.address === token?.owner ? 'You own it' : `Owned by ${token?.owner}`;

  return (
    <PagePaper className={classNames(className, 'nft-page')}>
      {loading ? (
        <div className="nft-page__loader">
          <Loader size="middle" />
        </div>
      ) : (
        <>
          <div className="nft-page__avatar">
            <Avatar size={536} src={avatar} />
          </div>
          <div className="nft-page__info-container">
            <NFTDetailsHeader title={token?.token_name} subtitle={owner} />
            <Divider />
            <TokenInformation attributes={token?.data} />
            <Divider />
            <CollectionInformation
              title={token?.collection_name}
              avatar={token?.collection_cover}
              description={token?.collection_description}
            />
          </div>
        </>
      )}
    </PagePaper>
  );
};

export const NFTDetails = styled(NFTDetailsComponent)`
  display: flex;
  flex-direction: row;
  align-items: flex-top;
  min-height: 500px;

  .nft-page {
    &__loader {
      margin: auto;
    }

    &__avatar {
      margin-right: calc(var(--prop-gap) * 2);
    }

    &__info-container {
      flex-grow: 1;
    }
  }
`;