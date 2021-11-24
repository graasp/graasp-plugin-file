import { THUMBNAIL_SIZES } from './utils/constants';

const upload = {
  querystring: {
    type: 'object',
    properties: {
      id: { $ref: 'http://graasp.org/#/definitions/uuid' },
    },
    additionalProperties: false,
  },
};

const download = {
  params: { $ref: 'http://graasp.org/#/definitions/idParam' },
  querystring: {
    type: 'object',
    properties: {
      size: {
        enum: THUMBNAIL_SIZES.map(({ name }) => name),
        default: THUMBNAIL_SIZES[0].name
      },
    },
    required: ['size'],
    additionalProperties: false,
  },
};

export { upload, download };
