import path from 'path/posix';

import { Actor, Item, Member, Task } from '@graasp/sdk';

import { FileServiceMethod } from '../src';

export const ROOT_PATH = './test/files';
export const IMAGE_PATH = './test/files/image.jpeg';
export const TEXT_PATH = './test/files/1.txt';

export const GET_ITEM_ID = 'dcd6aa46-a4f0-48b4-a872-f907cf646db0';
export const ITEM_S3_KEY =
  '35b6a6247b6a509e484bc0d91a9579d7d7ed9ddc5ee46f389ac562b2a1d9f1ec';

export const ITEM_FILE: Partial<Item> = {
  id: GET_ITEM_ID,
  name: 'item-file',
  type: 'file',
  extra: {
    s3File: {},
  },
};

export const GRAASP_ACTOR: Actor = {
  id: 'actorid',
};

export const ENABLE_S3 = {
  enableS3FileItemPlugin: true,
  pluginStoragePrefix: '',
  uploadValidation: async (): Promise<Task<Member, unknown>[]> => [],

  downloadValidation: async (): Promise<Task<Member, unknown>[]> => [],
  prefix: '/thumbnails',
};

export const DISABLE_S3 = {
  enableS3FileItemPlugin: false,
  pluginStoragePrefix: '',

  uploadValidation: async (): Promise<Task<Member, unknown>[]> => [],

  downloadValidation: async (): Promise<Task<Member, unknown>[]> => [],
  prefix: '/thumbnails',
};

export const DEFAULT_S3_OPTIONS = {
  s3Region: 'string',
  s3Bucket: 'string',
  s3AccessKeyId: 'string',
  s3SecretAccessKey: 'string',
  s3UseAccelerateEndpoint: false,
};

export const TEXT_FILE_PATH = 'test/files/1.txt';

export const DEFAULT_BUILD_FILE_PATH = (itemId, filename) =>
  `${itemId}/${filename}`;

export const buildDefaultLocalOptions = (storageRootPath?: string) => ({
  storageRootPath: storageRootPath ?? path.resolve(__dirname, './tmp'),
});

export const FILE_SERVICES = [FileServiceMethod.LOCAL, FileServiceMethod.S3];
