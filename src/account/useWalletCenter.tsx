import { useCallback, useState } from 'react';
import { ChainPropertiesResponse } from '@unique-nft/sdk';

import { PolkadotWallet } from '@app/account/PolkadotWallet';
import { KeyringWallet } from '@app/account/KeyringWallet';
import { MetamaskWallet } from '@app/account/MetamaskWallet';
import { BaseWalletType } from '@app/account/type';

export type ConnectedWalletsName =
  | 'polkadot-js'
  | 'keyring'
  | 'metamask'
  | 'talisman'
  | 'subwallet-js'
  | 'enkrypt'
  | 'novawallet';

const wallets = new Map<
  ConnectedWalletsName,
  typeof PolkadotWallet | typeof KeyringWallet | typeof MetamaskWallet
>([
  ['polkadot-js', PolkadotWallet],
  ['keyring', KeyringWallet],
  ['metamask', MetamaskWallet],
  ['talisman', PolkadotWallet],
  ['subwallet-js', PolkadotWallet],
  ['enkrypt', PolkadotWallet],
  ['novawallet', PolkadotWallet],
]);

export const CONNECTED_WALLET_TYPE = 'connected-wallet-type';

export const useWalletCenter = (chainProperties: ChainPropertiesResponse) => {
  const [connectedWallets, setConnectedWallets] = useState(
    new Map<ConnectedWalletsName, Map<string, BaseWalletType<any>>>([]),
  );

  const connectWallet = useCallback(
    async (typeWallet: ConnectedWalletsName) => {
      try {
        const wallet = new (wallets.get(typeWallet)!)(
          chainProperties,
          typeWallet !== 'keyring' && typeWallet !== 'metamask' ? typeWallet : undefined,
        );
        const currentWallets = await wallet.getAccounts();

        const connectedWallets =
          localStorage.getItem(CONNECTED_WALLET_TYPE)?.split(';') || [];

        if (!connectedWallets.includes(typeWallet)) {
          connectedWallets.push(typeWallet);
          localStorage.setItem(CONNECTED_WALLET_TYPE, connectedWallets.join(';'));
        }

        setConnectedWallets((prev) => new Map([...prev, [typeWallet, currentWallets]]));
      } catch (e: any) {
        const connectedWallets =
          localStorage.getItem(CONNECTED_WALLET_TYPE)?.split(';') || [];
        if (connectedWallets.includes(typeWallet)) {
          localStorage.setItem(
            CONNECTED_WALLET_TYPE,
            connectedWallets.filter((type) => type !== typeWallet).join(';'),
          );
        }
        throw e;
      }
    },
    [chainProperties],
  );

  return {
    connectWallet,
    connectedWallets,
  } as const;
};
