import S3 from 'aws-sdk/clients/s3';
import fs from 'fs';
import path from 'path/posix';
import { v4 } from 'uuid';

import { FastifyLoggerInstance } from 'fastify';

import { DatabaseTransactionHandler } from '@graasp/sdk';

import { FileServiceMethod } from '..';
import {
  DEFAULT_S3_OPTIONS,
  FILE_SERVICES,
  GRAASP_ACTOR,
  TEXT_FILE_PATH,
  buildDefaultLocalOptions,
} from '../../test/fixtures';
import { LocalService } from '../fileServices/localService';
import { S3Service } from '../fileServices/s3Service';
import { CopyFileInvalidPathError } from '../utils/errors';
import CopyFileTask from './copy-file-task';

const handler = {} as unknown as DatabaseTransactionHandler;
const log = {} as unknown as FastifyLoggerInstance;

// root path is at project root to be able to copy from one directory to another one
const DEFAULT_LOCAL_OPTIONS = buildDefaultLocalOptions(
  path.resolve(__dirname, '../..'),
);
const localService = new LocalService(DEFAULT_LOCAL_OPTIONS);
const s3Instance = new S3({
  region: 'region',
  credentials: {
    accessKeyId: 'accessKeyId',
    secretAccessKey: 'secretAccessKey',
  },
});
const s3Service = new S3Service({ ...DEFAULT_S3_OPTIONS, s3Instance });
const buildFileService = (service: FileServiceMethod) => {
  switch (service) {
    case FileServiceMethod.S3:
      return localService;
    case FileServiceMethod.LOCAL:
    default:
      return s3Service;
  }
};
const actor = GRAASP_ACTOR;

const buildInput = (opts?: {
  newFilePath?: string;
  originalPath?: string;
  mimetype?: string;
}) => {
  const { originalPath, mimetype, newFilePath } = opts ?? {};
  return {
    newId: v4(),
    newFilePath: newFilePath ?? 'file/newpath',
    originalPath: originalPath ?? 'file/originalpath',
    mimetype: mimetype ?? 'mimetype',
  };
};

describe('Copy File Task', () => {
  it.each(FILE_SERVICES)(
    '%s: Invalid original path should throw',
    (service) => {
      const input = buildInput({ originalPath: '' });

      const task = new CopyFileTask(actor, buildFileService(service), input);
      expect(async () => await task.run(handler, log)).rejects.toEqual(
        new CopyFileInvalidPathError(input.originalPath),
      );
    },
  );

  it.each(FILE_SERVICES)('%s: Invalid new path should throw', (service) => {
    const input = buildInput({ newFilePath: '' });

    const task = new CopyFileTask(actor, buildFileService(service), input);
    expect(async () => await task.run(handler, log)).rejects.toEqual(
      new CopyFileInvalidPathError(input.newFilePath),
    );
  });

  describe('Local', () => {
    it('Copy file', async () => {
      const input = buildInput({ originalPath: TEXT_FILE_PATH });

      const task = new CopyFileTask(actor, localService, input);
      await task.run(handler, log);

      // check file uploaded and its content
      const originalFile = fs.readFileSync(
        `${DEFAULT_LOCAL_OPTIONS.storageRootPath}/${input.originalPath}`,
      );
      const fullFilepath = `${DEFAULT_LOCAL_OPTIONS.storageRootPath}/${input.newFilePath}`;
      expect(fs.existsSync(fullFilepath)).toBe(true);
      expect(fs.readFileSync(fullFilepath).equals(originalFile)).toBeTruthy();

      // clean files
      fs.unlinkSync(fullFilepath);
    });
  });

  describe('S3', () => {
    it('Copy file', async () => {
      const input = buildInput({ originalPath: TEXT_FILE_PATH });

      s3Instance.copyObject = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));

      const task = new CopyFileTask(actor, s3Service, input);
      await task.run(handler, log);

      // check s3 call
      expect(s3Instance.copyObject).toHaveBeenCalledTimes(1);
    });
  });
});
