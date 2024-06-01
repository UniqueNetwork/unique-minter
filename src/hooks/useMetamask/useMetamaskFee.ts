import { BN, hexToBigInt } from '@polkadot/util';
import { useCallback, useState } from 'react';
import { FeeResponse, WithOptionalAddress } from '@unique-nft/sdk';
import { UseMutateAsyncFunction } from 'react-query';

import { formatKusamaBalance, truncateDecimalsBalanceSheet } from '@app/utils';
import { MetamaskDefaultDecimals } from '@app/account/MetamaskWallet';

export const useMetamaskFee = <P>(
  estimateGasMethod: (params: Omit<P, 'address'> & WithOptionalAddress) => Promise<BN>,
) => {
  const [fee, setFee] = useState<string>();
  const [gas, setGas] = useState<BN>();
  const [gasPrice, setGasPrice] = useState<BN>();
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeStatus, setFeeStatus] = useState<'success' | 'error' | 'loading' | 'idle'>(
    'idle',
  );
  const [feeLoading, setFeeLoading] = useState(false);

  const getFee: UseMutateAsyncFunction<
    { fee: FeeResponse } | undefined,
    Error,
    Omit<P, 'address'> & WithOptionalAddress,
    unknown
  > = useCallback(
    async (params: Omit<P, 'address'> & WithOptionalAddress) => {
      setFeeLoading(true);
      const { request } = (window as any).ethereum;
      try {
        const gasPrice = await request({
          method: 'eth_gasPrice',
        });

        // TODO: check chain valid - const chainId = await request({ method: 'eth_chainId' });

        setGasPrice(new BN(gasPrice.slice(2), 'hex'));

        const estimateGas = await estimateGasMethod(params);

        setGas(estimateGas);

        const amount = truncateDecimalsBalanceSheet(
          formatKusamaBalance(
            estimateGas.mul(new BN(hexToBigInt(gasPrice).toString())).toString(),
            MetamaskDefaultDecimals,
          ),
        );

        const fee: FeeResponse = {
          raw: estimateGas.toString(),
          amount,
          formatted: amount,
          unit: '',
          decimals: MetamaskDefaultDecimals,
        };

        setFee(fee.amount);
        setFeeStatus('success');
        return { fee };
      } catch (error: any) {
        setFeeError(error.message);
        console.error(error);
        setFeeStatus('error');
      } finally {
        setFeeLoading(false);
      }
    },
    [estimateGasMethod],
  );

  return {
    fee: fee || '0',
    feeFormatted: fee || '0',
    getFee,
    gas,
    gasPrice,
    feeStatus,
    feeLoading,
    feeError,
  };
};
