import { VFC } from 'react';
import { Outlet, useOutlet } from 'react-router-dom';
import classNames from 'classnames';

import { PagePaper } from '@app/components';
import { MyCollectionsWrapper } from '@app/pages/MyCollections/MyCollectionsWrapper';
import { withPageTitle } from '@app/HOCs/withPageTitle';

import { useMyCollectionsContext } from './context';
import { MyCollectionsFilter, MyCollectionsList } from './components';

interface MyCollectionsComponentProps {
  className?: string;
}

export const MyCollectionsComponent: VFC<MyCollectionsComponentProps> = ({
  className,
}) => {
  const { order, page, search, onChangePagination } = useMyCollectionsContext();

  const isChildExist = useOutlet();

  return (
    <PagePaper
      noPadding
      flexLayout="column"
      className={classNames('my-collections', className)}
    >
      {!isChildExist ? (
        <>
          <MyCollectionsFilter />
          <MyCollectionsList
            order={order}
            page={page}
            search={search}
            onPageChange={onChangePagination}
          />
        </>
      ) : (
        <Outlet />
      )}
    </PagePaper>
  );
};

const MyCollectionsWrapped = () => (
  <MyCollectionsWrapper>
    <MyCollectionsComponent />
  </MyCollectionsWrapper>
);

export const MyCollections = withPageTitle({ header: 'My collections' })(
  MyCollectionsWrapped,
);
