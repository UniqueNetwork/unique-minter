import { gql, useQuery } from '@apollo/client';
import { useCallback } from 'react';
import { CollectionsData, CollectionsVariables, FetchMoreCollectionsOptions, useGraphQlCollectionsProps } from './types';

const collectionsQuery = gql`
  query getCollections(
    $limit: Int
    $offset: Int
    $where: view_collections_bool_exp = {}
  ) {
    view_collections(where: $where, limit: $limit, offset: $offset) {
      collection_cover
      collection_id
      description
      name
      offchain_schema
      owner
      token_limit
      token_prefix
    }
    view_collections_aggregate {
      aggregate {
        count
      }
    }
  }
`;

export const useGraphQlCollections = ({
  filter,
  pageSize
}: useGraphQlCollectionsProps) => {
  const getWhere = useCallback(
    (searchString?: string) => ({
      _and: {
        ...(filter ? { _or: filter } : {}),
        ...(searchString
          ? {
              _or: {
                description: { _ilike: searchString },
                name: { _ilike: searchString },
                token_prefix: { _ilike: searchString }
              }
            }
          : {})
      }
    }),
    [filter]
  );

  const {
    data,
    error: fetchCollectionsError,
    fetchMore,
    loading: isCollectionsFetching
  } = useQuery<CollectionsData, CollectionsVariables>(collectionsQuery, {
    fetchPolicy: 'network-only',
    // Used for first execution
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
    variables: {
      limit: pageSize,
      offset: 0,
      where: getWhere()
    }
  });

  const fetchMoreCollections = useCallback(
    ({
      limit = pageSize,
      offset,
      searchString
    }: FetchMoreCollectionsOptions) => {
      return fetchMore({
        variables: {
          limit,
          offset,
          where: getWhere(searchString)
        }
      });
    },
    [fetchMore, getWhere, pageSize]
  );

  return {
    collections: data?.view_collections || [],
    collectionsCount: data?.view_collections_aggregate.aggregate.count || 0,
    fetchCollectionsError,
    fetchMoreCollections,
    isCollectionsFetching
  };
};

export const useGraphQlCollection = (collectionId: string) => {
  const {
    data,
    error: fetchCollectionsError,
    loading: isCollectionFetching
  } = useQuery<CollectionsData, CollectionsVariables>(collectionsQuery, {
    fetchPolicy: 'network-only',
    // Used for first execution
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
    variables: {
      limit: 1,
      offset: 0,
      where: { collection_id: { _eq: collectionId } }
    }
  });

  return {
    collection: data?.view_collections[0] || undefined,
    fetchCollectionsError,
    isCollectionFetching
  };
};

export { collectionsQuery };
