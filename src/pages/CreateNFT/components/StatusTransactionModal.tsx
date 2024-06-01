import { ReactNode } from 'react';
import styled from 'styled-components';

import { Modal, ModalProps } from '@app/components/Modal';
import { Button, ProgressBar, Typography } from '@app/components';

import { Alert } from '../../../components/Alert';
import { Loader } from '../../../components/Loader';

type Props = Pick<ModalProps, 'isVisible'> & {
  uploadingProgress?: number;
  mintingProgress?: number;
  totalTokens: number;
  batchSize: number;
  stage: 'uploading' | 'minting' | 'done';
  isVisible: boolean;
  title?: string;
  warning?: ReactNode;
  onComplete(): void;
  onContinue(): void;
};

export const StatusTransactionModal = ({
  title = 'Please wait',
  stage,
  uploadingProgress = 0,
  mintingProgress = 0,
  totalTokens,
  batchSize,
  isVisible,
  onComplete,
  onContinue,
}: Props) => {
  return (
    <Modal isVisible={isVisible} isClosable={false} title={title}>
      <StagesWrapper>
        <Loader state={stage === 'uploading' ? 'process' : 'done'} />
        <StageDescription>
          <Typography size="m" weight="regular">{`Uploading ${
            uploadingProgress + 1
          } of ${totalTokens} files`}</Typography>
          <Typography size="s" color="grey-500">
            Step 1
          </Typography>
        </StageDescription>
        <Loader
          state={
            stage === 'uploading' ? 'idle' : stage === 'minting' ? 'process' : 'done'
          }
        />
        <StageDescription>
          <Typography size="m" weight="regular">{`Minting ${
            mintingProgress + 1
          }-${Math.min(
            mintingProgress + batchSize,
            totalTokens,
          )} of ${totalTokens} tokens`}</Typography>
          <Typography size="s" color="grey-500">
            Step 2
          </Typography>
        </StageDescription>
      </StagesWrapper>
      {stage !== 'done' && (
        <AlertStyled type="warning">
          Please do not close or refresh this page until the token minting is completed.
        </AlertStyled>
      )}
      {stage === 'done' && (
        <ButtonsWrapper>
          <Button title="Create more" role="primary" onClick={onContinue} />
          <Button title="Go to my tokens" onClick={onComplete} />
        </ButtonsWrapper>
      )}
    </Modal>
  );
};

const StagesWrapper = styled.div`
  display: grid;
  grid-template-columns: 24px 1fr;
  align-items: flex-start;
  grid-column-gap: var(--gap);
  grid-row-gap: calc(var(--gap) * 2);
  align-items: center;
  @media (min-width: 768px) {
    min-width: 500px;
  }
`;

const StageDescription = styled.div`
  display: flex;
  flex-direction: column;
`;

const ButtonsWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: calc(var(--gap) * 2);
  gap: calc(var(--gap) * 2);
`;

const AlertStyled = styled(Alert)`
  margin-top: calc(var(--prop-gap) * 1.5);
  margin-bottom: 8px !important;
`;
