import { Chain } from '@app/types';

import { getChainList, getDefaultChain } from './utils/configParser';

declare type Env = {
  NET_DEFAULT: string | undefined;
  IPFS_GATEWAY: string | undefined;
  SCAN_ACCOUNT_URL: string | undefined;
} & Record<string, string | undefined>;

declare type Config = {
  IPFSGateway: string | undefined;
  allChains: Record<string, Chain>;
  activeChains: Record<string, Chain>;
  defaultChain: Chain;
  telegramBot: string | undefined;
  mexcQTZUSDT: string | undefined;
  cryptoExchangeUNQ: string | undefined;
  zenDeskToken: string | undefined;
  zendeskApi: string | undefined;
  oldCollectionMessage: string | undefined;
  rampApiKey: string | undefined;
  socialLinks: {
    telegram: string;
    twitter: string;
    discord: string;
    github: string;
    subsocial: string;
    homepage: string;
  };
  version: string;
};

declare global {
  interface Window {
    ENV: Env;
    walletExtension?: {
      isNovaWallet?: boolean;
    };
  }
}

const allChains = getChainList(window.ENV || process.env);
const activeChains = getChainList(window.ENV || process.env, true);

export const config: Config = {
  allChains,
  activeChains,
  IPFSGateway: window.ENV?.IPFS_GATEWAY_URL || process.env.REACT_APP_IPFS_GATEWAY_URL,
  defaultChain: activeChains[getDefaultChain(window.ENV || process.env)],
  telegramBot: window.ENV?.TELEGRAM_BOT || process.env.REACT_APP_NET_TELEGRAM_BOT,
  mexcQTZUSDT: window.ENV?.MEXC_QTZ_USDT || process.env.REACT_APP_NET_MEXC_QTZ_USDT,
  zendeskApi: window.ENV?.ZENDESK_API || process.env.REACT_APP_ZENDESK_API,
  cryptoExchangeUNQ:
    window.ENV?.CRYPTO_EXCHANGE_UNQ || process.env.REACT_APP_CRYPTO_EXCHANGE_UNQ,
  zenDeskToken:
    window.ENV?.ZENDESK_OAUTH_APP_TOKEN || process.env.REACT_APP_ZENDESK_OAUTH_APP_TOKEN,
  oldCollectionMessage:
    window.ENV?.OLD_COLLECTION_MESSAGE || process.env.REACT_APP_OLD_COLLECTION_MESSAGE,
  socialLinks: {
    telegram: window.ENV?.TELEGRAM_LINK || process.env.REACT_APP_TELEGRAM_LINK || '',
    twitter: window.ENV?.TWITTER_LINK || process.env.REACT_APP_TWITTER_LINK || '',
    discord: window.ENV?.DISCORD_LINK || process.env.REACT_APP_DISCORD_LINK || '',
    github: window.ENV?.GITHUB_LINK || process.env.REACT_APP_GITHUB_LINK || '',
    subsocial: window.ENV?.SUBSOCIAL_LINK || process.env.REACT_APP_SUBSOCIAL_LINK || '',
    homepage: window.ENV?.HOMEPAGE_LINK || process.env.REACT_APP_HOMEPAGE_LINK || '',
  },
  version: window.ENV?.VERSION || process.env.REACT_APP_VERSION || '',
  rampApiKey: window.ENV?.RAMP_API_KEY || process.env.REACT_APP_RAMP_API_KEY || '',
};
