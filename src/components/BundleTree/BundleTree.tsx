import { useCallback, useState } from 'react';
import styled from 'styled-components';

import { Tree } from './Tree';
import { IBundleTree, INode } from './types';

function BundleTree<T extends INode>({
  dataSource,
  nodeView: NodeView,
  onNodeClicked: onNodeClickedProps,
  nestedSectionView: NestedSectionView,
  className,
  compareNodes,
  childrenProperty,
  getKey,
  onViewNodeDetails,
  onUnnestClick,
  onTransferClick,
}: IBundleTree<T>) {
  const [selectedToken, setSelectedToken] = useState<T | null>(null);
  const onNodeClicked = useCallback((data: T) => {
    setSelectedToken(data.selected ? data : null);
    onNodeClickedProps(data);
  }, []);

  return (
    <Wrapper>
      <Tree<T>
        dataSource={dataSource}
        nodeView={NodeView}
        className={className}
        compareNodes={compareNodes}
        childrenProperty={childrenProperty}
        getKey={getKey}
        onViewNodeDetails={onViewNodeDetails}
        onUnnestClick={onUnnestClick}
        onTransferClick={onTransferClick}
        onNodeClicked={onNodeClicked}
      />
      {NestedSectionView && (
        <NestedSectionView
          selectedToken={selectedToken}
          onViewNodeDetails={onViewNodeDetails}
          onUnnestClick={onUnnestClick}
          onTransferClick={onTransferClick}
        />
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  overflow: hidden;
  border-radius: var(--prop-border-radius);
  border: 1px solid var(--color-grey-300);
  display: flex;

  @media screen and (min-width: 1024px) {
    max-height: 355px;
  }

  .tree-container {
    padding-top: 1px;

    & > .tree-node {
      &:first-child {
        min-width: max-content;
        width: 100%;
      }
    }
  }
`;

export default BundleTree;
