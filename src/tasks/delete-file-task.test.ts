import { FastifyLoggerInstance } from 'fastify';
import fs from 'fs';
import S3 from 'aws-sdk/clients/s3';
import { DatabaseTransactionHandler } from 'graasp';
import { ServiceMethod } from '..';
import {
  GRAASP_ACTOR,
  buildDefaultLocalOptions,
  FILE_SERVICES,
  DEFAULT_S3_OPTIONS,
} from '../../test/fixtures';
import { LocalService } from '../fileServices/localService';
import { S3Service } from '../fileServices/s3Service';
import { DeleteFileInvalidPathError } from '../utils/errors';
import DeleteFileTask from './delete-file-task';

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
const buildFileService = (service: ServiceMethod) => {
  switch (service) {
    case ServiceMethod.S3:
      return localService;
    case ServiceMethod.LOCAL:
    default:
      return s3Service;
  }
};
const actor = GRAASP_ACTOR;

const buildInput = (opts?: { filepath?: string }) => {
  const { filepath } = opts ?? {};
  return {
    filepath: filepath ?? 'file/newpath',
  };
};

describe('Delete File Task', () => {
  it.each(FILE_SERVICES)('%s: Invalid path should throw', (service) => {
    const input = buildInput({ filepath: '' });

    const task = new DeleteFileTask(actor, buildFileService(service), input);
    expect(async () => await task.run(handler, log)).rejects.toEqual(
      new DeleteFileInvalidPathError(input.filepath),
    );
  });

  describe('Local', () => {
    it('Delete file', async () => {
      const input = buildInput({ filepath: 'file-to-delete' });
      // create tmp file
      const p = `${DEFAULT_LOCAL_OPTIONS.storageRootPath}/${input.filepath}`;
      fs.writeFileSync(p, 'Hello content!');
      expect(fs.existsSync(p)).toBeTruthy();

      const task = new DeleteFileTask(actor, localService, input);
      await task.run(handler, log);

      // check file uploaded and its content
      expect(fs.existsSync(p)).toBeFalsy();
    });
  });

  describe('S3', () => {
    it('Delete file', async () => {
      const input = buildInput();

      s3Instance.deleteObject = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));

      const task = new DeleteFileTask(actor, s3Service, input);
      await task.run(handler, log);

      // check s3 call
      expect(s3Instance.deleteObject).toHaveBeenCalledTimes(1);
    });
  });
});
