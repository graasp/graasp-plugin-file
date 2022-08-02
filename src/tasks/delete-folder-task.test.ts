import S3 from 'aws-sdk/clients/s3';
import fs from 'fs';
import { mkdir } from 'fs/promises';

import { FastifyLoggerInstance } from 'fastify';

import {
  DatabaseTransactionHandler,
  FileItemType,
  ItemType,
} from '@graasp/sdk';

import {
  DEFAULT_S3_OPTIONS,
  FILE_TYPES,
  GRAASP_ACTOR,
  buildDefaultLocalOptions,
} from '../../test/fixtures';
import { LocalService } from '../fileServices/localService';
import { S3Service } from '../fileServices/s3Service';
import { DeleteFolderInvalidPathError } from '../utils/errors';
import DeleteFolderTask from './delete-folder-task';

const handler = {} as unknown as DatabaseTransactionHandler;
const log = {} as unknown as FastifyLoggerInstance;

// root path is at project root to be able to copy from one directory to another one
const DEFAULT_LOCAL_OPTIONS = buildDefaultLocalOptions();
const localService = new LocalService(DEFAULT_LOCAL_OPTIONS);
const s3Instance = new S3({
  region: 'region',
  credentials: {
    accessKeyId: 'accessKeyId',
    secretAccessKey: 'secretAccessKey',
  },
});
const s3Service = new S3Service({ ...DEFAULT_S3_OPTIONS, s3Instance });
const buildFileService = (service: FileItemType) => {
  switch (service) {
    case ItemType.S3_FILE:
      return localService;
    case ItemType.LOCAL_FILE:
    default:
      return s3Service;
  }
};
const actor = GRAASP_ACTOR;

const buildInput = (opts?: { folderPath?: string }) => {
  const { folderPath } = opts ?? {};
  return {
    folderPath: folderPath ?? 'file/newpath',
  };
};

describe('Delete Folder Task', () => {
  it.each(FILE_TYPES)('%s: Invalid path should throw', (service) => {
    const input = buildInput({ folderPath: '' });

    const task = new DeleteFolderTask(actor, buildFileService(service), input);
    expect(async () => await task.run(handler, log)).rejects.toEqual(
      new DeleteFolderInvalidPathError(input.folderPath),
    );
  });

  describe('Local', () => {
    it('Delete folder', async () => {
      const input = buildInput({ folderPath: 'folder-to-delete' });
      // create tmp folder and file
      const p = `${DEFAULT_LOCAL_OPTIONS.storageRootPath}/${input.folderPath}`;
      await mkdir(p, { recursive: true });
      fs.writeFileSync(`${p}/file-to-delete`, 'Hello content!');
      expect(fs.existsSync(p)).toBeTruthy();

      const task = new DeleteFolderTask(actor, localService, input);
      await task.run(handler, log);

      // check file uploaded and its content
      expect(fs.existsSync(p)).toBeFalsy();
    });
  });

  describe('S3', () => {
    it('Delete folder', async () => {
      const input = buildInput();

      const listReturnValue = { Contents: [{ Key: 'some/key' }] };
      s3Instance.listObjectsV2 = jest.fn().mockImplementation(() => ({
        promise: jest.fn().mockResolvedValue(listReturnValue),
      }));
      s3Instance.deleteObjects = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));

      const task = new DeleteFolderTask(actor, s3Service, input);
      await task.run(handler, log);

      // check s3 call
      expect(s3Instance.deleteObjects).toHaveBeenCalledTimes(1);
      expect(s3Instance.listObjectsV2).toHaveBeenCalledTimes(1);
    });
    it('Delete empty folder', async () => {
      const input = buildInput();

      const listReturnValue = { Contents: [] };
      s3Instance.listObjectsV2 = jest.fn().mockImplementation(() => ({
        promise: jest.fn().mockResolvedValue(listReturnValue),
      }));
      s3Instance.deleteObjects = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));

      const task = new DeleteFolderTask(actor, s3Service, input);
      await task.run(handler, log);

      // check s3 call
      expect(s3Instance.deleteObjects).toHaveBeenCalledTimes(0);
      expect(s3Instance.listObjectsV2).toHaveBeenCalledTimes(1);
    });
  });
});
