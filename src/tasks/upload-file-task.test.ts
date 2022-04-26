import { FastifyLoggerInstance } from 'fastify';
import fs, { ReadStream } from 'fs';
import S3 from 'aws-sdk/clients/s3';
import { DatabaseTransactionHandler } from 'graasp';
import path from 'path';
import { ServiceMethod } from '..';
import {
  GRAASP_ACTOR,
  buildDefaultLocalOptions,
  FILE_SERVICES,
  DEFAULT_S3_OPTIONS,
  IMAGE_PATH,
  TEXT_FILE_PATH,
} from '../../test/fixtures';
import { LocalService } from '../fileServices/localService';
import { S3Service } from '../fileServices/s3Service';
import { UploadFileInvalidParameterError } from '../utils/errors';
import UploadFileTask from './upload-file-task';

const handler = {} as unknown as DatabaseTransactionHandler;
const log = {} as unknown as FastifyLoggerInstance;

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
const DEFAULT_FILE_PATH = path.resolve(__dirname, '../..', TEXT_FILE_PATH);
const DEFAULT_FILE_STREAM = fs.createReadStream(DEFAULT_FILE_PATH);

const buildInput = (opts?: {
  file?: ReadStream;
  filepath?: string;
  mimetype?: string;
  size?: number;
}) => {
  const { filepath, mimetype, file, size } = opts ?? {};
  return {
    file: file ?? DEFAULT_FILE_STREAM,
    filepath: filepath ?? DEFAULT_FILE_PATH,
    mimetype: mimetype ?? 'mimetype',
    size: size ?? 123,
  };
};

describe('Upload File Task', () => {
  it.each(FILE_SERVICES)('%s: Invalid filepath should throw', (service) => {
    const input = buildInput({ filepath: '' });

    const task = new UploadFileTask(actor, buildFileService(service), input);
    expect(async () => await task.run(handler, log)).rejects.toEqual(
      new UploadFileInvalidParameterError({
        file: DEFAULT_FILE_STREAM,
        filepath: input.filepath,
        size: input.size,
      }),
    );
  });

  it.each(FILE_SERVICES)('%s: Empty file should throw', (service) => {
    const input = buildInput();
    input.file = null;

    const task = new UploadFileTask(actor, buildFileService(service), input);
    expect(async () => await task.run(handler, log)).rejects.toEqual(
      new UploadFileInvalidParameterError({
        file: null,
        filepath: input.filepath,
        size: input.size,
      }),
    );
  });

  it.each(FILE_SERVICES)('%s: Empty size should throw', (service) => {
    const input = buildInput({ size: 0 });

    const task = new UploadFileTask(actor, buildFileService(service), input);
    expect(async () => await task.run(handler, log)).rejects.toEqual(
      new UploadFileInvalidParameterError({
        file: DEFAULT_FILE_STREAM,
        filepath: input.filepath,
        size: input.size,
      }),
    );
  });

  describe('Local', () => {
    it('Upload file at storagepath/filepath', async () => {
      const input = buildInput();

      const task = new UploadFileTask(actor, localService, input);
      await task.run(handler, log);

      // check file uploaded and its content
      const fullFilepath = `${DEFAULT_LOCAL_OPTIONS.storageRootPath}/${input.filepath}`;
      expect(fs.existsSync(fullFilepath)).toBe(true);
      expect(
        fs.readFileSync(fullFilepath).equals(fs.readFileSync(input.filepath)),
      ).toBeTruthy();

      // clean files
      fs.unlinkSync(fullFilepath);
    });
  });

  describe('S3', () => {
    it('Upload file at storagepath/filepath', async () => {
      const input = buildInput();
      s3Instance.putObject = jest
        .fn()
        .mockImplementation(() => ({ promise: jest.fn() }));

      const task = new UploadFileTask(actor, s3Service, input);
      await task.run(handler, log);

      // check s3 call
      expect(s3Instance.putObject).toHaveBeenCalledTimes(1);
    });
  });
});
