import React, { VFC } from 'react';

import { TNFTModalType } from '@app/pages/NFTDetails/Modals/types';
import { TransferModal } from '@app/pages/NFTDetails/Modals/TransferModal';
import { BurnModal } from '@app/pages/NFTDetails/Modals/BurnModal';
import { ShareModal } from '@app/pages/NFTDetails/Modals/ShareModal';
import { Token } from '@app/api/graphQL/types';

interface NFTModalsProps {
  modalType: TNFTModalType;
  token?: Token;
  onComplete(): void;
  onClose(): void;
}

export const NFTModals: VFC<NFTModalsProps> = ({
  modalType,
  token,
  onComplete,
  onClose,
}) => {
  if (!token) {
    return null;
  }

  switch (modalType) {
    case 'transfer':
      return (
        <TransferModal
          isVisible={true}
          token={token}
          onClose={onClose}
          onComplete={onComplete}
        />
      );
    case 'share':
      return <ShareModal isVisible={true} token={token} onClose={onClose} />;
    case 'burn':
      return (
        <BurnModal
          isVisible={true}
          token={token}
          onClose={onClose}
          onComplete={onComplete}
        />
      );
  }
  return null;
};
