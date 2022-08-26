import { Chain } from '@app/types';

import { getChainList, getDefaultChain } from './utils/configParser';

declare type Env = {
  NET_DEFAULT: string | undefined;
  IPFS_GATEWAY: string | undefined;
  SCAN_ACCOUNT_URL: string | undefined;
} & Record<string, string | undefined>;

declare type Config = {
  IPFSGateway: string | undefined;
  chains: Record<string, Chain>;
  defaultChain: Chain;
  telegramBot: string | undefined;
  mexcQTZUSDT: string | undefined;
  zenDeskToken: string | undefined;
  oldCollectionMessage: string | undefined;
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
  }
}

const chains = getChainList(window.ENV || process.env);

export const config: Config = {
  IPFSGateway: window.ENV?.IPFS_GATEWAY_URL || process.env.REACT_APP_IPFS_GATEWAY_URL,
  defaultChain: chains[getDefaultChain(window.ENV || process.env)],
  chains,
  telegramBot: window.ENV?.TELEGRAM_BOT || process.env.REACT_APP_NET_TELEGRAM_BOT,
  mexcQTZUSDT: window.ENV?.MEXC_QTZ_USDT || process.env.REACT_APP_NET_MEXC_QTZ_USDT,
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
};

console.log(config);
