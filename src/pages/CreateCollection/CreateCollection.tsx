import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Button, useNotifications } from '@unique-nft/ui-kit';
import styled from 'styled-components';
import classNames from 'classnames';
import { useDebounce } from 'use-debounce';
import { Text, useNotifications } from '@unique-nft/ui-kit';

import { ROUTE } from '@app/routes';
import { useCollectionCreate, useExtrinsicCacheEntities } from '@app/api';
import {
  DeviceSize,
  useAccounts,
  useApi,
  useDeviceSize,
  useFormValidator,
} from '@app/hooks';
import { useCollectionCreate, useExtrinsicCacheEntities } from '@app/api';
import { ROUTE } from '@app/routes';
import {
  Button,
  CollectionSidebar,
  CollectionStepper,
  Confirm,
  MintingBtn,
  StatusTransactionModal,
} from '@app/components';
import { MainWrapper, WrapperContent } from '@app/pages/components/PageComponents';
import { BottomBar } from '@app/pages/components/BottomBar';

import { mapCollectionForm } from './helpers';
import { tabsUrls, warnings } from './constants';
import { CollectionForm, Warning } from './types';
import { CollectionTabs, WarningModal } from './components';
import { FormWrapper } from '../components/FormComponents';
import { CollectionSidebar, FeeInformationTransaction } from './features';
import { useFeeContext } from './context';

interface CreateCollectionProps {
  className?: string;
}

const WrapperContentStyled = styled(WrapperContent)`
  margin-bottom: calc(var(--prop-gap) * 2.5);

  @media screen and (min-width: 1025px) {
    margin-bottom: 0;
  }
`;

const firstPage = ['name', 'symbol'];

export const CreateCollectionComponent = ({ className }: CreateCollectionProps) => {
  const deviceSize = useDeviceSize();
  const [step, setStep] = useState(1);
  const [warning, setWarning] = useState<Warning | null>();
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const navigate = useNavigate();
  const { currentChain } = useApi();
  const { selectedAccount } = useAccounts();
  const { error, info } = useNotifications();
  const { setPayloadEntity } = useExtrinsicCacheEntities();

  const { submitWaitResult, isLoadingSubmitResult, submitWaitResultError } =
    useCollectionCreate();

  const { handleSubmit, getValues } = useFormContext<CollectionForm>();

  const { fee } = useFeeContext();

  const collectionForm = useForm<CollectionForm>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      symbol: '',
      description: '',
      address: selectedAccount?.address,
      nesting: {
        tokenOwner: true,
      },
    },
  });
  const {
    control,
    formState: { isValid },
    handleSubmit,
  } = collectionForm;
  const collectionFormValues = useWatch<CollectionForm>({
    control,
  });

  useEffect(() => {
    navigate(tabsUrls[step - 1]);
  }, [step, navigate]);

  useEffect(() => {
    if (!submitWaitResultError) {
      return;
    }
    error(submitWaitResultError);
  }, [submitWaitResultError]);

  const goToPreviousStep = useCallback((step: number) => {
    setStep(step);
  }, []);
  const onNextStep = useCallback((step: number) => {
    const coverPictureIpfsCid = getValues('coverPictureIpfsCid');

    console.log(coverPictureIpfsCid);

    if (!coverPictureIpfsCid) {
      setWarning(warnings.coverIsNotDefine);

      return;
    }

    goToNextStep(currentStep + 1);
  };

  const onCreateCollectionHandle = (form: CollectionForm) => {
    if (!form.attributes?.length) {
      setWarning(warnings.attributesAreNotDefine);

      return;
    }

    onSubmit(form);
  };

  const onSubmit = useCallback((form: CollectionForm) => {
    if (!selectedAccount) {
      error('Account is not found');

      return;
    }

    const payload = mapCollectionForm(form);

    submitWaitResult({ payload }).then((res) => {
      info('Collection created successfully');

      setPayloadEntity({
        type: 'create-collection',
        parsed: res?.parsed,
        entityData: payload,
      });

      navigate(`/${currentChain?.network}/${ROUTE.MY_COLLECTIONS}`);
    });
  }, []);
  const onCreateCollectionHandler = useCallback(() => handleSubmit(onSubmit)(), []);

  const onConfirmHandler = useCallback(() => {
    setWarning(null);
    setStep((prevStep) => ++prevStep);
  }, []);

  const onCancelHandler = useCallback(() => {
    setWarning(null);
  }, []);

  return (
    <MainWrapper className={classNames('create-collection-page', className)}>
      <WarningModal
        warning={warning}
        onConfirm={onConfirmHandler}
        onCancel={onCancelHandler}
      />
      <WrapperContentStyled>
        <FormWrapper>
          <CollectionStepper activeStep={currentStep} onClickStep={goToPreviousStep} />
          {isolatedCollectionForm}
          <FeeInformationTransaction fee={feeFormatted} />
          <ButtonGroup>
            {!isLastStep && (
              <MintingBtn
                iconRight={{
                  color: 'currentColor',
                  name: 'arrow-right',
                  size: 12,
                }}
                title="Next step"
                disabled={!isValid}
                onClick={handleSubmit(onNextStep)}
              />
            )}
            {!isFirstStep && (
              <Button
                iconLeft={{
                  color: 'var(--color-primary-400)',
                  name: 'arrow-left',
                  size: 12,
                }}
                title="Previous step"
                onClick={() => goToPreviousStep(currentStep - 1)}
              />
            )}
            {isLastStep && (
              <MintingBtn
                role="primary"
                title="Create collection"
                tooltip={isBalanceInsufficient ? NO_BALANCE_MESSAGE : undefined}
                disabled={!isValid || isBalanceInsufficient}
                onClick={handleSubmit(onCreateCollectionHandle)}
              />
            )}
          </ButtonGroup>
          <Confirm
            buttons={[
              { title: 'No, return', onClick: () => setWarning(null) },
              {
                title: 'Yes, I am sure',
                role: 'primary',
                type: 'submit',
                onClick: handleSubmit((form: CollectionForm) => {
                  if (isLastStep) {
                    onSubmit(form);
                  } else {
                    goToNextStep(2);
                  }

                  setWarning(null);
                }),
              },
            ]}
            isVisible={!!warning}
            title={warning?.title}
            onClose={() => setWarning(null)}
          >
            <Outlet />
            <FeeInformationTransaction />
          </CollectionTabs>
          <StatusTransactionModal
            isVisible={isLoadingSubmitResult}
            description="Creating collection"
          />
        </FormWrapper>
      </WrapperContentStyled>
      {deviceSize >= DeviceSize.lg ? (
        <CollectionSidebar />
      ) : (
        <BottomBar
          buttons={[
            <Button
              title={isDrawerOpen ? 'Back' : 'Preview'}
              key="toggleDrawer"
              onClick={() => setDrawerOpen(!isDrawerOpen)}
            />,
          ]}
          isOpen={isDrawerOpen}
          parent={document.body}
        >
          <CollectionSidebar />
        </BottomBar>
      )}
    </MainWrapper>
  );
};
