import React, { VFC } from 'react';

import { Stages } from '@app/components';
import { StageStatus } from '@app/types';
import { Modal } from '@app/components/Modal';

const stages = [
  {
    title: 'Transfer in progress',
    status: StageStatus.inProgress,
  },
];

export const TransferStagesModal: VFC = () => {
  return (
    <Modal isVisible={true} title="Transfer NFT">
      <Stages stages={stages} />
    </Modal>
  );
};
