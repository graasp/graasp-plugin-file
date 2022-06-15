import { S3 } from 'aws-sdk';
import { FastifyLoggerInstance } from 'fastify';
import { existsSync } from 'fs';
import { rm } from 'fs-extra';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import {
  buildDefaultLocalOptions,
  DEFAULT_S3_OPTIONS,
  GRAASP_ACTOR,
} from '../../test/fixtures';
import { LocalService } from '../fileServices/localService';
import { S3Service } from '../fileServices/s3Service';
import CopyFolderTask from './copy-folder-task';

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

const actor = GRAASP_ACTOR;

describe('Copy Folder Task', () => {
  describe('Local', () => {
    it('Copy folder', async () => {
      const testFolder = path.join(
        DEFAULT_LOCAL_OPTIONS.storageRootPath,
        'test-folder',
      );
      await mkdir(testFolder, { recursive: true });
      await writeFile(path.join(testFolder, 'file-a'), 'Hello content A');
      await writeFile(path.join(testFolder, 'file-b'), 'Hello content B');

      const task = new CopyFolderTask(actor, localService, {
        originalFolderPath: 'test-folder',
        newFolderPath: 'test-copy-folder',
      });

      const newFolder = path.join(
        DEFAULT_LOCAL_OPTIONS.storageRootPath,
        'test-copy-folder',
      );
      const newFileA = path.join(newFolder, 'file-a');
      const newFileB = path.join(newFolder, 'file-b');

      await task.run({}, {} as FastifyLoggerInstance);

      expect(existsSync(newFolder)).toBeTruthy();
      expect(existsSync(newFileA)).toBeTruthy();
      expect(existsSync(newFileB)).toBeTruthy();

      const contentA = await readFile(newFileA, { encoding: 'utf-8' });
      const contentB = await readFile(newFileB, { encoding: 'utf-8' });

      expect(contentA).toEqual('Hello content A');
      expect(contentB).toEqual('Hello content B');

      rm(testFolder, { force: true, recursive: true });
      rm(newFolder, { force: true, recursive: true });
    });
  });

  describe('S3', () => {
    it('Copy folder', async () => {
      const mockObjects = [{ Key: 'some/key' }, { Key: 'some/foo/bar' }];

      s3Instance.listObjectsV2 = jest.fn().mockImplementation(() => ({
        promise: jest.fn().mockResolvedValue({
          Contents: mockObjects,
        }),
      }));

      s3Instance.copyObject = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));

      const task = new CopyFolderTask(actor, s3Service, {
        originalFolderPath: 'some',
        newFolderPath: 'test',
      });
      await task.run({}, {} as FastifyLoggerInstance);

      expect(s3Instance.listObjectsV2).toHaveBeenCalledTimes(1);
      expect(s3Instance.copyObject).toHaveBeenCalledTimes(mockObjects.length);
    });
  });
});
