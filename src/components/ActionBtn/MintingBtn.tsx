import { ButtonProps } from '@unique-nft/ui-kit';

import { useAccounts, useApi } from '@app/hooks';
import { BaseActionBtn } from '@app/components/ActionBtn/BaseActionBtn';

export const MintingBtn = (props: ButtonProps & { tooltip?: string | null }) => {
  const { currentChain } = useApi();
  const { selectedAccount } = useAccounts();
  return (
    <BaseActionBtn
      {...props}
      actionEnabled={
        Boolean(selectedAccount?.isMintingEnabled) && currentChain.mintingEnabled
      }
      actionText="Minting temporary unavailable due to a chain upgrade"
    />
  );
};
