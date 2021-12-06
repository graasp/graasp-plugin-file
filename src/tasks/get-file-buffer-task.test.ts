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
  TEXT_FILE_PATH,
} from '../../test/fixtures';
import { LocalService } from '../fileServices/localService';
import { S3Service } from '../fileServices/s3Service';
import {
  GetFileBufferInvalidParameterError,
  LocalFileNotFound,
  S3FileNotFound,
} from '../utils/errors';
import path from 'path';
import GetFileBufferTask from './get-file-buffer-task';
import { StatusCodes } from 'http-status-codes';

const handler = {} as unknown as DatabaseTransactionHandler;
const log = {} as unknown as FastifyLoggerInstance;

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

const buildInput = (opts?: { filename?: string }) => {
  const { filename } = opts ?? {};
  return {
    filename: filename ?? 'filename',
  };
};

describe('Get File Buffer Task', () => {
  it.each(FILE_SERVICES)('%s: Invalid parameters should throw', (service) => {
    const input = buildInput({ filename: '' });

    const task = new GetFileBufferTask(actor, buildFileService(service), input);
    expect(async () => await task.run(handler, log)).rejects.toEqual(
      new GetFileBufferInvalidParameterError({ filename: input.filename }),
    );
  });

  describe('Local', () => {
    it(`Get File buffer`, async () => {
      const input = buildInput({ filename: TEXT_FILE_PATH });

      const task = new GetFileBufferTask(actor, localService, input);
      await task.run(handler, log);

      // check file uploaded and its content
      const fullFilepath = `${DEFAULT_LOCAL_OPTIONS.storageRootPath}/${input.filename}`;
      expect(fs.existsSync(fullFilepath)).toBe(true);

      // should be a buffer
      expect(task.result.length).toBeTruthy();
    });

    it(`Should throw NOT FOUND for unexisting file`, async () => {
      const input = buildInput({ filename: 'file-not-found' });
      const task = new GetFileBufferTask(actor, localService, input);
      expect(async () => await task.run(handler, log)).rejects.toEqual(
        new LocalFileNotFound({ filepath: input.filename }),
      );
    });
  });

  describe('S3', () => {
    it('Get file buffer', async () => {
      const input = buildInput({ filename: TEXT_FILE_PATH });
      s3Instance.getObject = jest.fn().mockImplementation(() => ({
        promise: jest.fn(() => ({ Body: 'body' })),
      }));

      const task = new GetFileBufferTask(actor, s3Service, input);
      await task.run(handler, log);

      // check s3 call
      expect(s3Instance.getObject).toHaveBeenCalledTimes(1);
    });
    it('Throw NOT FOUND if file is not found', async () => {
      const input = buildInput({ filename: 'file-not-found' });
      s3Instance.getObject = jest.fn().mockImplementation(() => ({
        promise: jest
          .fn()
          .mockRejectedValue({ statusCode: StatusCodes.NOT_FOUND }),
      }));

      const task = new GetFileBufferTask(actor, s3Service, input);
      expect(async () => await task.run(handler, log)).rejects.toEqual(
        new S3FileNotFound({ filepath: input.filename }),
      );
    });
  });
});
