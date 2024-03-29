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
        enum: THUMBNAIL_SIZES,
        default: THUMBNAIL_SIZES[0],
      },
      replyUrl: {
        type: 'boolean',
        default: false,
      },
    },
    required: ['size'],
    additionalProperties: false,
  },
};

export { upload, download };
