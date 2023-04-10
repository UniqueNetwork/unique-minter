import { FC, useCallback, useState } from 'react';
import keyring from '@polkadot/ui-keyring';

import { useAccounts } from '@app/hooks';
import { Modal } from '@app/components/Modal';
import { PasswordInput } from '@app/components/PasswordInput/PasswordInput';
import { QRReader, ScannedResult } from '@app/components/QRReader/QRReader';
import { AdditionalText, LabelText } from '@app/pages/Accounts/Modals/commonComponents';
import { ContentRow } from '@app/pages/components/ModalComponents';
import { AddressWidget } from '@app/pages/Accounts/components/AddressWidget';
import { Button, Typography } from '@app/components';

import { TCreateAccountModalProps } from './types';

export const ImportViaQRCodeAccountModal: FC<TCreateAccountModalProps> = ({
  isVisible,
  onFinish,
}) => {
  const [address, setAddress] = useState<string>();
  const [scanned, setScanned] = useState<ScannedResult>();
  const [password, setPassword] = useState<string>('');
  const { addAccountViaQR } = useAccounts();

  const onScan = useCallback((scanned: ScannedResult) => {
    setScanned(scanned);

    setAddress(
      scanned.isAddress
        ? scanned.content
        : keyring.createFromUri(scanned.content, {}, 'sr25519').address,
    );
  }, []);

  const onSaveClick = useCallback(() => {
    if (!scanned) {
      return;
    }

    const { name, isAddress, content, genesisHash } = scanned;

    addAccountViaQR({
      name: name || 'unnamed',
      isAddress,
      content,
      genesisHash,
      password,
    });
    onFinish();
  }, [scanned, password, onFinish]);

  return (
    <Modal
      footerButtons={
        <Button
          disabled={!address || !password}
          role="primary"
          title="Save"
          onClick={onSaveClick}
        />
      }
      isVisible={isVisible}
      title="Add an account via QR-code"
      onClose={onFinish}
    >
      <ContentRow>
        <Typography size="m">
          Provide the account QR from the module/external application for scanning. Once
          detected as valid, you will be taken to the next step to add the account to your
          list.
        </Typography>
      </ContentRow>
      <ContentRow>
        {address ? <AddressWidget address={address} /> : <QRReader onScan={onScan} />}
      </ContentRow>
      <ContentRow>
        <LabelText size="m">Password</LabelText>
        <AdditionalText size="s" color="grey-500">
          The password that was previously used to encrypt this account
        </AdditionalText>
        <PasswordInput placeholder="Password" value={password} onChange={setPassword} />
      </ContentRow>
    </Modal>
  );
};
