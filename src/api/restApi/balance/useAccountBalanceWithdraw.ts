import { Address } from '@unique-nft/utils';
import { useState } from 'react';

import { useAccounts, useApi } from '@app/hooks';
import { Account } from '@app/account';

import { repeatCheckForTransactionFinish } from './utils';

type WithdrawMutationArgs = {
  address: string;
  amount: string;
};

export const useAccountBalanceWithdraw = ({
  senderAccount,
}: {
  senderAccount: Account;
}) => {
  const { api } = useApi();
  const { signMessage } = useAccounts();
  const [submitWaitResultError, setSubmitWaitResultError] = useState<string>();

  return {
    submitWaitResultError,
    async submitWaitResult({ address, amount }: WithdrawMutationArgs) {
      try {
        const unsignedTxPayloadBody = await api.extrinsic.build({
          section: 'evm',
          method: 'withdraw',
          address,
          args: [Address.mirror.substrateToEthereum(address), amount],
        });

        const signature = await signMessage(
          unsignedTxPayloadBody,
          senderAccount?.address,
        );

        await api.extrinsic.submit({
          signerPayloadJSON: unsignedTxPayloadBody.signerPayloadJSON,
          signature,
        });

        await repeatCheckForTransactionFinish(async () => {
          const balance = await api.balance.get({
            address: Address.mirror.substrateToEthereum(address),
          });

          return balance.freeBalance.amount === '0';
        });
      } catch (e) {
        setSubmitWaitResultError(`${e}`);
        throw e;
      }
    },
  };
};
