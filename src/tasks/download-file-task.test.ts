import { FastifyLoggerInstance, FastifyReply } from 'fastify';
import fs from 'fs';
import S3 from 'aws-sdk/clients/s3';
import { v4 } from 'uuid';
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
  DownloadFileInvalidParameterError,
  LocalFileNotFound,
  S3FileNotFound,
} from '../utils/errors';
import path from 'path';
import DownloadFileTask from './download-file-task';
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

const buildInput = (opts?: {
  itemId?: string;
  filepath?: string;
  mimetype?: string;
  reply?: FastifyReply;
}) => {
  const { filepath, mimetype, itemId, reply } = opts ?? {};
  return {
    itemId: itemId ?? v4(),
    filepath: filepath ?? 'file/path',
    mimetype: mimetype ?? 'mimetype',
    reply:
      reply ??
      ({
        type: jest.fn(),
        header: jest.fn(),
        redirect: jest.fn(),
      } as unknown as FastifyReply),
  };
};

describe('Download File Task', () => {
  it.each(FILE_SERVICES)('%s: Invalid parameters should throw', (service) => {
    const input = buildInput({ filepath: '' });

    const task = new DownloadFileTask(actor, buildFileService(service), input);
    expect(async () => await task.run(handler, log)).rejects.toEqual(
      new DownloadFileInvalidParameterError({
        filepath: input.filepath,
        mimetype: input.mimetype,
        itemId: input.itemId,
      }),
    );
  });

  describe('Local', () => {
    it(`Download file at storagepath/filepath`, async () => {
      const input = buildInput({ filepath: TEXT_FILE_PATH });

      const task = new DownloadFileTask(actor, localService, input);
      await task.run(handler, log);

      // check file uploaded and its content
      const fullFilepath = `${DEFAULT_LOCAL_OPTIONS.storageRootPath}/${input.filepath}`;
      expect(fs.existsSync(fullFilepath)).toBe(true);

      // should be a readstream
      expect(task.result.path).toEqual(fullFilepath);
    });

    it(`Should throw NOT FOUND for unexisting file`, async () => {
      const input = buildInput({ filepath: 'file-not-found' });
      const task = new DownloadFileTask(actor, localService, input);
      expect(async () => await task.run(handler, log)).rejects.toEqual(
        new LocalFileNotFound({
          filepath: input.filepath,
          itemId: input.itemId,
        }),
      );
    });
  });

  describe('S3', () => {
    it(`Download file`, async () => {
      const input = buildInput({ filepath: TEXT_FILE_PATH });
      s3Instance.headObject = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));

      const task = new DownloadFileTask(actor, s3Service, input);
      await task.run(handler, log);

      // check s3 call
      expect(s3Instance.headObject).toHaveBeenCalledTimes(1);
    });
    it(`Throw NOT FOUND if file is not found`, async () => {
      const input = buildInput({ filepath: 'file-not-found' });
      s3Instance.headObject = jest.fn().mockImplementation(() => ({
        promise: jest
          .fn()
          .mockRejectedValue({ statusCode: StatusCodes.NOT_FOUND }),
      }));

      const task = new DownloadFileTask(actor, s3Service, input);
      expect(async () => await task.run(handler, log)).rejects.toEqual(
        new S3FileNotFound({ filepath: input.filepath, itemId: input.itemId }),
      );
    });
  });
});