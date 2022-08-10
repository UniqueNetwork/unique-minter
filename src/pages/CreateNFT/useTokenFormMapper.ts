import { CreateTokenNewDto } from '@app/types/Api';

import { Attribute, AttributeOption, FilledTokenForm } from './types';

const attributeMapper = (attribute?: Attribute) => {
  if (
    attribute === '' ||
    attribute === null ||
    attribute === undefined ||
    (Array.isArray(attribute) && !attribute?.length)
  ) {
    return null;
  }

  if (Array.isArray(attribute)) {
    return attribute.map((attr: AttributeOption) => attr.id);
  }

  if (typeof attribute === 'string') {
    return { _: attribute };
  }

  if (typeof attribute === 'object') {
    return attribute.id;
  }

  return attribute;
};

export const useTokenFormMapper = () => {
  const mapper = (formData: FilledTokenForm): CreateTokenNewDto => {
    const request: CreateTokenNewDto = {
      owner: formData.address,
      address: formData.address,
      collectionId: formData.collectionId,
      data: {
        image: {
          ipfsCid: formData.imageIpfsCid,
        },
      },
    };

    if (formData.attributes?.length) {
      request.data.encodedAttributes = formData.attributes.reduce((acc, attr, index) => {
        const mapped = attributeMapper(attr);
        if (mapped === null) {
          return acc;
        }

        return {
          ...acc,
          [index]: mapped,
        };
      }, {});
    }

    return request;
  };

  return mapper;
};
