import styled from 'styled-components';
import { Tabs } from '@unique-nft/ui-kit';
import React, { useEffect, VFC } from 'react';
import classNames from 'classnames';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { usePageSettingContext } from '@app/context';
import { PagePaperNoPadding } from '@app/components';

import { NFTFilters } from './NFTs';
import { NFTsWrapper } from './context';

interface MyTokensComponentProps {
  activeTab: number;
  basePath: string;
  className?: string;
  tabUrls: string[];
}

const MyTokensComponent: VFC<MyTokensComponentProps> = ({
  activeTab,
  basePath,
  className,
  tabUrls,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setPageBreadcrumbs, setPageHeading } = usePageSettingContext();

  useEffect(() => {
    if (location.pathname === basePath) {
      navigate(tabUrls[activeTab]);
    }
  }, [activeTab, basePath, location.pathname, navigate, tabUrls]);

  useEffect(() => {
    setPageBreadcrumbs({ options: [] });
    setPageHeading('My tokens');
  }, []);

  const currentTabIndex = tabUrls.findIndex((tab) =>
    location.pathname.includes(`${basePath}/${tab}`),
  );

  const handleClick = (tabIndex: number) => {
    navigate(tabUrls[tabIndex]);
  };

  useEffect(() => {
    navigate(tabUrls[activeTab]);
  }, []);

  return (
    <NFTsWrapper>
      <PagePaperNoPadding>
        <div className={classNames('my-tokens', className)}>
          <div className="tabs-header">
            <Tabs
              activeIndex={currentTabIndex}
              labels={['NFTs', 'Coins']}
              type="slim"
              onClick={handleClick}
            />
            <Tabs activeIndex={currentTabIndex}>
              <NFTFilters />
              <></>
            </Tabs>
          </div>
          <Tabs activeIndex={currentTabIndex}>
            <Outlet />
            <Outlet />
          </Tabs>
        </div>
      </PagePaperNoPadding>
    </NFTsWrapper>
  );
};

export const MyTokens = styled(MyTokensComponent)`
  .tabs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 calc(var(--prop-gap) * 2);
    border-bottom: 1px solid var(--color-grey-300);
  }

  .unique-tabs-contents {
    padding-top: 0;
    padding-bottom: 0;
  }
`;
