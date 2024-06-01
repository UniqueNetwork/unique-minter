import { ChainPropertiesResponse, UnsignedTxPayloadResponse } from '@unique-nft/sdk';
import { web3FromSource } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { Polkadot, SignerPayloadJSON } from '@unique-nft/utils/extension';
import { Address } from '@unique-nft/utils';

import { AccountUtils } from './AccountUtils';
import { BaseWalletEntity, BaseWalletType } from './type';
import { Account, AccountSigner } from './AccountContext';

export type PolkadotWalletName =
  | 'polkadot-js'
  | 'subwallet-js'
  | 'talisman'
  | 'enkrypt'
  | 'novawallet';

export class PolkadotWallet implements BaseWalletEntity<InjectedAccountWithMeta> {
  _accounts = new Map<string, BaseWalletType<InjectedAccountWithMeta>>();
  isMintingEnabled = true;
  wallet: PolkadotWalletName;

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly chainProperties: ChainPropertiesResponse,
    defaultWallet: PolkadotWalletName = 'polkadot-js',
  ) {
    this.wallet = defaultWallet;
  }

  changeChain(): Promise<void> {
    return Promise.resolve();
  }

  async getAccounts() {
    const wallets = await Polkadot.loadWalletByName(this.wallet);

    this._accounts = new Map(
      wallets.accounts
        .filter(({ address }) => Address.is.substrateAddress(address))
        .map((account) => {
          const normalizedAddress = Address.normalize.substrateAddress(account.address);

          return [
            normalizedAddress,
            {
              name: account.meta.name || '',
              normalizedAddress,
              address: AccountUtils.encodeAddress(
                account.address,
                this.chainProperties.SS58Prefix,
              ),
              walletMetaInformation: account,
              signerType: AccountSigner.extension,
              sign: async (unsignedTxPayload: UnsignedTxPayloadResponse) => {
                return (await account.signPayload(unsignedTxPayload.signerPayloadJSON))
                  .signature;
              },
              signer: account.signer,
              changeChain: this.changeChain.bind(this),
              isMintingEnabled: this.isMintingEnabled,
            },
          ];
        }),
    );

    return this._accounts;
  }
}
