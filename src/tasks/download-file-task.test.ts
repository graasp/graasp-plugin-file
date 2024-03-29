import S3 from 'aws-sdk/clients/s3';
import fs, { ReadStream } from 'fs';
import { StatusCodes } from 'http-status-codes';
import path from 'path';
import { v4 } from 'uuid';

import { FastifyLoggerInstance, FastifyReply } from 'fastify';

import { DatabaseTransactionHandler, ItemType } from '@graasp/sdk';

import {
  DEFAULT_S3_OPTIONS,
  FILE_TYPES,
  GRAASP_ACTOR,
  TEXT_FILE_PATH,
  TEXT_PATH,
  buildDefaultLocalOptions,
} from '../../test/fixtures';
import { LocalService } from '../fileServices/localService';
import { S3Service } from '../fileServices/s3Service';
import {
  DownloadFileInvalidParameterError,
  LocalFileNotFound,
  S3FileNotFound,
} from '../utils/errors';
import DownloadFileTask from './download-file-task';

const handler = {} as unknown as DatabaseTransactionHandler;
const log = {} as unknown as FastifyLoggerInstance;

const filepath = path.join(__dirname, '../..', TEXT_PATH);
const body = fs.createReadStream(filepath);
jest.mock('node-fetch', () =>
  jest.fn().mockReturnValue({
    body: { pipe: (writeStream) => body.pipe(writeStream), on: jest.fn() },
  }),
);

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
const buildFileService = (service: ItemType) => {
  switch (service) {
    case ItemType.S3_FILE:
      return localService;
    case ItemType.LOCAL_FILE:
    default:
      return s3Service;
  }
};

const actor = GRAASP_ACTOR;

const buildInput = (opts?: {
  itemId?: string;
  filepath?: string;
  mimetype?: string;
  fileStorage?: string;
  reply?: FastifyReply;
  expiration?: number;
}) => {
  const {
    filepath,
    mimetype,
    itemId,
    expiration,
    reply = {
      type: jest.fn(),
      header: jest.fn(),
      redirect: jest.fn(),
    } as unknown as FastifyReply,
    fileStorage,
  } = opts ?? {};
  return {
    itemId: itemId ?? v4(),
    filepath: filepath ?? 'file/path',
    mimetype: mimetype ?? 'mimetype',
    fileStorage,
    reply,
    expiration,
  };
};

describe('Download File Task', () => {
  it.each(FILE_TYPES)('%s: Invalid parameters should throw', (service) => {
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
    it('Download file at storagepath/filepath', async () => {
      const input = buildInput({ filepath: TEXT_FILE_PATH });

      const task = new DownloadFileTask(actor, localService, input);
      await task.run(handler, log);

      // check file uploaded and its content
      const fullFilepath = `${DEFAULT_LOCAL_OPTIONS.storageRootPath}/${input.filepath}`;
      expect(fs.existsSync(fullFilepath)).toBe(true);

      // should be a readstream
      expect((task.result as ReadStream).path).toEqual(fullFilepath);
    });

    it('Should throw NOT FOUND for unexisting file', async () => {
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
    it('Download file and redirect', async () => {
      const input = buildInput({ filepath: TEXT_FILE_PATH });
      s3Instance.headObject = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));
      s3Instance.getSignedUrlPromise = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));

      const task = new DownloadFileTask(actor, s3Service, input);
      await task.run(handler, log);

      // check s3 call
      expect(s3Instance.headObject).toHaveBeenCalledTimes(1);
      expect(s3Instance.getSignedUrlPromise).toHaveBeenCalledTimes(1);
      expect(input.reply.redirect).toHaveBeenCalledTimes(1);
    });
    // this test fails locally, but not in CI
    /* it('Download file and  return file', async () => {
      const input = buildInput({
        filepath: TEXT_FILE_PATH,
        reply: null,
        fileStorage: path.join(__dirname, '../../test/tmp'),
      });
      s3Instance.headObject = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));
      s3Instance.getSignedUrlPromise = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));

      const task = new DownloadFileTask(actor, s3Service, input);
      await task.run(handler, log);

      // check s3 call
      expect(s3Instance.headObject).toHaveBeenCalledTimes(1);
      expect(s3Instance.getSignedUrlPromise).toHaveBeenCalledTimes(1);
      expect(task.result).toBeTruthy();
    }); */
    it('Download file and return url', async () => {
      const input = buildInput({
        filepath: TEXT_FILE_PATH,
        reply: null,
      });
      s3Instance.headObject = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));
      const url = 'myurl';
      s3Instance.getSignedUrlPromise = jest.fn().mockImplementation(() => url);

      const task = new DownloadFileTask(actor, s3Service, input);
      await task.run(handler, log);

      // check s3 call
      expect(s3Instance.headObject).toHaveBeenCalledTimes(1);
      expect(s3Instance.getSignedUrlPromise).toHaveBeenCalledTimes(1);
      expect(task.result).toEqual(url);
    });
    it('Download file and return link with given expiration', async () => {
      const expiration = 123;
      const input = buildInput({ filepath: TEXT_FILE_PATH, expiration });
      s3Instance.headObject = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));
      const mockGetSignedUrl = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));
      s3Instance.getSignedUrlPromise = mockGetSignedUrl;

      const task = new DownloadFileTask(actor, s3Service, input);
      await task.run(handler, log);

      // check s3 call
      expect(s3Instance.headObject).toHaveBeenCalledTimes(1);
      expect(s3Instance.getSignedUrlPromise).toHaveBeenCalledTimes(1);
      expect(mockGetSignedUrl.mock.calls[0][1].Expires).toEqual(expiration);
      expect(input.reply.redirect).toHaveBeenCalledTimes(1);
    });
    it('Throw NOT FOUND if file is not found', async () => {
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
