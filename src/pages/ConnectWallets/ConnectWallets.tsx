import { useCallback, useContext, useState } from 'react';
import styled from 'styled-components';
import { Ethereum } from '@unique-nft/utils/extension';

import SubWalletIcon from 'static/icons/subwallet.svg';
import EnkriptIcon from 'static/icons/enkrypt.svg';
import NovaWalletIcon from 'static/icons/nova_icon_radial.svg';

import { Icon, Modal, Button } from '@app/components';
import { logUserEvent, UserEvents } from '@app/utils/logUserEvent';
import {
  CreateAccountModal,
  ExtensionMissingModal,
  Extensions,
  ImportViaJSONAccountModal,
  ImportViaQRCodeAccountModal,
  ImportViaSeedAccountModal,
} from '@app/pages';
import { DeviceSize, useAccounts, useDeviceSize } from '@app/hooks';
import { ConnectWalletModalContext } from '@app/context';

enum AccountModal {
  CREATE = 'create',
  VIA_SEED = 'importViaSeed',
  VIA_JSON = 'importViaJSON',
  VIA_QR = 'importViaQRCode',
  EXTENSION_MISSING = 'extensionMissing',
}

export const ConnectWallets = () => {
  const { isOpenConnectWalletModal, setIsOpenConnectWalletModal } = useContext(
    ConnectWalletModalContext,
  );
  const [currentModal, setCurrentModal] = useState<AccountModal | undefined>();
  const [missingExtension, setMissingExtension] = useState<Extensions>();
  const { walletsCenter } = useAccounts();

  const onCreateAccountClick = useCallback(() => {
    logUserEvent(UserEvents.CREATE_SUBSTRATE);
    setCurrentModal(AccountModal.CREATE);
  }, []);

  const onChangeAccountsFinish = useCallback(() => {
    setCurrentModal(undefined);
    setIsOpenConnectWalletModal(false);
  }, []);

  const handleOpenModal = (modalType: AccountModal) => () => {
    logUserEvent(UserEvents.ADD_ACCOUNT_VIA);
    setCurrentModal(modalType);
  };

  const handleConnectToMetamask = async () => {
    try {
      await Ethereum.requestAccounts();
      await walletsCenter.connectWallet('metamask');
      setIsOpenConnectWalletModal(false);
    } catch (e: any) {
      setMissingExtension('Metamask');
      setCurrentModal(AccountModal.EXTENSION_MISSING);
    }
  };

  const handleConnectToPolkadotExtension = async () => {
    try {
      await walletsCenter.connectWallet('polkadot-js');
      await walletsCenter.connectWallet('keyring');
      setIsOpenConnectWalletModal(false);
    } catch (e: any) {
      setMissingExtension('Polkadot');
      setCurrentModal(AccountModal.EXTENSION_MISSING);
    }
  };

  const handleConnectToTalismanExtension = async () => {
    try {
      await walletsCenter.connectWallet('talisman');
      setIsOpenConnectWalletModal(false);
    } catch (e: any) {
      setMissingExtension('Talisman');
      setCurrentModal(AccountModal.EXTENSION_MISSING);
    }
  };

  const handleConnectToSubWalletExtension = async () => {
    try {
      await walletsCenter.connectWallet('subwallet-js');
      setIsOpenConnectWalletModal(false);
    } catch (e: any) {
      setMissingExtension('SubWallet');
      setCurrentModal(AccountModal.EXTENSION_MISSING);
    }
  };

  const handleConnectToEnkryptExtension = async () => {
    try {
      await walletsCenter.connectWallet('enkrypt');
      setIsOpenConnectWalletModal(false);
    } catch (e: any) {
      setMissingExtension('Enkrypt');
      setCurrentModal(AccountModal.EXTENSION_MISSING);
    }
  };

  const handleConnectToNovaWallet = async () => {
    try {
      await walletsCenter.connectWallet('polkadot-js');
      setIsOpenConnectWalletModal(false);
    } catch (e: any) {
      setMissingExtension('NovaWallet');
      setCurrentModal(AccountModal.EXTENSION_MISSING);
    }
  };

  const isMobile = DeviceSize.sm <= useDeviceSize();

  return (
    <>
      <Modal
        isVisible={isOpenConnectWalletModal}
        title="Connect wallet"
        onClose={() => {
          setIsOpenConnectWalletModal(false);
        }}
      >
        <p>
          Choose how you want to connect. If you don&apos;t have a wallet, you can select
          a provider and create one.
        </p>
        <Wallets>
          {!window.walletExtension?.isNovaWallet && (
            <>
              <WalletItem onClick={handleConnectToPolkadotExtension}>
                <Icon size={40} name="polkadot-wallet" /> <span>Polkadot.js</span>
              </WalletItem>
              <WalletItem onClick={handleConnectToMetamask}>
                <Icon size={40} name="metamask-wallet" /> <span>Metamask</span>
              </WalletItem>
              <WalletItem onClick={handleConnectToTalismanExtension}>
                <Icon size={40} name="talisman-wallet" /> <span>Talisman</span>
              </WalletItem>
              <WalletItem onClick={handleConnectToSubWalletExtension}>
                <Icon file={SubWalletIcon} size={40} />
                <span>SubWallet</span>
              </WalletItem>
              <WalletItem onClick={handleConnectToEnkryptExtension}>
                <Icon file={EnkriptIcon} size={40} />
                <span>Enkrypt</span>
              </WalletItem>
              {!isMobile && <div></div>}
              {isMobile && (
                <WalletItem href="https://novawallet.io" target="_blank">
                  <Icon file={NovaWalletIcon} size={40} />
                  <span>Nova Wallet</span>
                </WalletItem>
              )}
            </>
          )}
          {window.walletExtension?.isNovaWallet && (
            <WalletItem onClick={handleConnectToNovaWallet}>
              <Icon file={NovaWalletIcon} size={40} />
              <span>Nova Wallet</span>
            </WalletItem>
          )}
        </Wallets>
      </Modal>

      <CreateAccountModal
        isVisible={currentModal === AccountModal.CREATE}
        onFinish={onChangeAccountsFinish}
      />
      <ImportViaSeedAccountModal
        isVisible={currentModal === AccountModal.VIA_SEED}
        onFinish={onChangeAccountsFinish}
      />
      <ImportViaJSONAccountModal
        isVisible={currentModal === AccountModal.VIA_JSON}
        onFinish={onChangeAccountsFinish}
      />
      <ImportViaQRCodeAccountModal
        isVisible={currentModal === AccountModal.VIA_QR}
        onFinish={onChangeAccountsFinish}
      />
      <ExtensionMissingModal
        isVisible={currentModal === AccountModal.EXTENSION_MISSING}
        missingExtension={missingExtension}
        onFinish={() => setCurrentModal(undefined)}
      />
    </>
  );
};

const Wallets = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-top: var(--prop-gap);
  gap: calc(var(--prop-gap) / 2);
  & > a {
    width: calc(50% - 6px);
  }
  @media (max-width: 768px) {
    & > a {
      width: 100%;
    }
  }
`;

const WalletItem = styled.a`
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-grey-100);
  box-sizing: border-box;
  padding: 11px 27px;
  flex: 1 1 auto;
  cursor: pointer;
  border-radius: calc(var(--prop-gap) / 2);

  span {
    margin-left: 10px;
    font-size: 18px;
    font-weight: 500;
    color: var(--color-additional-dark);
  }
`;

const Buttons = styled.div`
  margin: var(--prop-gap) 0 calc(var(--prop-gap) * 2);
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--prop-gap) / 2);

  & > button {
    flex: 1 1 calc(50% - 10px);
    &:first-child {
      flex: 1 1 100%;
    }
  }
`;
