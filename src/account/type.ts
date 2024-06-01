import { Account, AccountSigner } from '@app/account/AccountContext';
import { UnsignedTxPayloadResponse } from '@app/types/Api';

export type BaseWalletType<T> = {
  name: string;
  address: string;
  normalizedAddress: string;
  signerType: AccountSigner;
  walletMetaInformation: T;
  sign(data: any, account?: any, meta?: any): any;
  changeChain(network: string): Promise<void>;
  isMintingEnabled: boolean;
};

export type BaseWalletEntity<T> = {
  isMintingEnabled: boolean;
  changeChain(network: string): Promise<void>;
  getAccounts(): Promise<Map<string, BaseWalletType<T>>>;
};
