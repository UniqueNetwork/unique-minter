import React, { VFC } from 'react';
import classNames from 'classnames';
import styled, { css } from 'styled-components';
import { Button, Icon, Loader } from '@unique-nft/ui-kit';

import { NetworkType } from '@app/types';

interface CoinsRowComponentProps {
  address?: string;
  balanceFull?: string;
  balanceLocked?: string;
  balanceTransferable?: string;
  loading?: boolean;
  className?: string;
  iconName: string;
  name: string;
  symbol: NetworkType;
  onSend: (network: NetworkType) => void;
}

export const CoinsRowComponent: VFC<CoinsRowComponentProps> = (props) => {
  const {
    address = '',
    balanceFull = '',
    balanceLocked = '',
    balanceTransferable = '',
    loading,
    className,
    iconName,
    name,
    symbol,
    onSend,
  } = props;

  const copyAddress = (account: string) => {
    void navigator.clipboard.writeText(account);

    // todo - add notification from ui kit here https://cryptousetech.atlassian.net/browse/UI-94
    /* return queueAction({
        account,
        action: 'clipboard',
        message: 'address copied',
        status: 'queued'
      }); */
  };

  const onCopyAccount = () => {
    address && copyAddress(address);
  };

  return (
    <div className={classNames('coins-row', className)}>
      <NetworkAddress>
        <Icon name={iconName} size={24} />
        <div>
          <div className="network-name">{name}</div>
          <div className="network-address-copy">
            <span>{address}</span>
            <div onClick={onCopyAccount}>
              <Icon name="copy" size={24} />
            </div>
          </div>
        </div>
      </NetworkAddress>
      <NetworkBalances>
        {loading ? (
          <Loader />
        ) : (
          <>
            <div className="balance-full">{balanceFull}</div>
            <div className="balance-transferable">
              {`${balanceTransferable} transferable` ?? 'no transferable'}
            </div>
            <div className="balance-locked">
              {balanceLocked ? `${balanceLocked} ${symbol} locked` : 'no locked'}
            </div>
          </>
        )}
      </NetworkBalances>
      <NetworkActions>
        <Button title="Send" onClick={() => onSend(symbol)} />
        <Button disabled title="Get" />
      </NetworkActions>
    </div>
  );
};

const FlexColumn = css`
  align-items: center;
  display: flex;
  grid-column-gap: calc(var(--prop-gap) / 2);
`;

const NetworkActions = styled.div`
  ${FlexColumn};
`;

const Bold = css`
  font-family: var(--prop-font-family);
  font-size: 16px;
  font-weight: 500;
`;

const BoldMargin4 = css`
  ${Bold};
  margin-bottom: calc(var(--prop-gap) / 4);
`;

const NetworkAddress = styled.div`
  ${FlexColumn};

  .network-name {
    ${BoldMargin4};
  }

  .network-address-copy {
    ${FlexColumn};
    color: var(--color-grey-500);
    font-size: 14px;

    img {
      cursor: pointer;
    }
  }
`;

const NetworkBalances = styled.div`
  .balance-full {
    min-width: 300px;
    ${BoldMargin4};
  }

  .balance-transferable,
  .balance-locked {
    color: var(--color-grey-500);
    line-height: 22px;
  }
`;

export const CoinsRow = styled(CoinsRowComponent)`
  display: flex;
  justify-content: space-between;
  padding: var(--prop-gap) 0;
  border-bottom: 1px solid var(--color-grey-300);
`;
