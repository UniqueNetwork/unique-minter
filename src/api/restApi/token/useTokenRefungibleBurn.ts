import { BurnRefungibleBody, BurnRefungibleParsed } from '@unique-nft/sdk';

import { useAccounts, useApi } from '@app/hooks';
import { useExtrinsicMutation } from '@app/api';
import { MetamaskAccountName } from '@app/account/MetamaskWallet';
import { useMetamaskBurnRefungibleToken } from '@app/hooks/useMetamask/useMetamaskBurnRefungibleToken';

export const useTokenRefungibleBurn = () => {
  const { api } = useApi();
  const { selectedAccount } = useAccounts();

  const defaultTokensTransfer = useExtrinsicMutation(api.refungible.burn);
  const metamaskTokensBurn = useMetamaskBurnRefungibleToken();

  if (selectedAccount?.name === MetamaskAccountName) {
    return metamaskTokensBurn;
  }

  return defaultTokensTransfer;
};
