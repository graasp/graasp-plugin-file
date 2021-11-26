import FormData from 'form-data';
import { createReadStream } from 'fs';
import path from 'path';
import { StatusCodes } from 'http-status-codes';
import { TaskRunner, Task } from 'graasp-test';
import { v4 } from 'uuid';
import build from './app';
import {
  TEXT_FILE_PATH,
  DEFAULT_BUILD_FILE_PATH,
  DEFAULT_S3_OPTIONS,
  FILE_SERVICES,
  buildDefaultLocalOptions,
} from './fixtures';
import { mockCreateDownloadFileTask, mockCreateUploadFileTask } from './mock';
import { BuildFilePathFunction, ServiceMethod } from '../src/types';

const runner = new TaskRunner();

const buildAppOptions = (
  { serviceMethod, serviceOptions, buildFilePath },
  {
    uploadPreHookTasks = null,
    uploadPostHookTasks = null,
    downloadPreHookTasks = jest
      .fn()
      .mockResolvedValue([new Task({ some: 'value' })]),
    downloadPostHookTasks = null,
  } = {},
) => ({
  runner,
  options: {
    serviceMethod,
    serviceOptions,
    buildFilePath,
    uploadPreHookTasks,
    uploadPostHookTasks,
    downloadPreHookTasks,
    downloadPostHookTasks,
  },
});

const buildLocalOptions = (
  storageRootPath?: string,
  buildFilePath?: BuildFilePathFunction,
) => ({
  serviceMethod: ServiceMethod.LOCAL,
  serviceOptions: {
    local: buildDefaultLocalOptions(storageRootPath),
  },
  buildFilePath: buildFilePath ?? DEFAULT_BUILD_FILE_PATH,
});

const buildS3Options = (
  s3 = DEFAULT_S3_OPTIONS,
  buildFilePath?: BuildFilePathFunction,
) => ({
  serviceMethod: ServiceMethod.S3,
  serviceOptions: {
    s3,
  },
  buildFilePath: buildFilePath ?? DEFAULT_BUILD_FILE_PATH,
});

const buildFileServiceOptions = (service) => {
  if (service === ServiceMethod.LOCAL) {
    return buildLocalOptions();
  } else if (service === ServiceMethod.S3) {
    return buildS3Options();
  }
  throw new Error('Service is not defined');
};

describe('Plugin File Base Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(TaskRunner.prototype, 'runSingleSequence')
      .mockImplementation(async (tasks) => {
        return tasks[0]?.getResult();
      });
  });

  describe('Options', () => {
    beforeEach(() => {
      jest.spyOn(runner, 'setTaskPostHookHandler').mockImplementation(() => {});
      jest.spyOn(runner, 'setTaskPreHookHandler').mockImplementation(() => {});
    });

    describe('Local', () => {
      it('Valid options should resolve', async () => {
        const app = await build(buildAppOptions(buildLocalOptions()));
        expect(app).toBeTruthy();

        const app1 = await build(buildAppOptions(buildLocalOptions('')));
        expect(app1).toBeTruthy();

        const app2 = await build(buildAppOptions(buildLocalOptions('hello')));
        expect(app2).toBeTruthy();

        const app3 = await build(buildAppOptions(buildLocalOptions('/hello')));
        expect(app3).toBeTruthy();
      });
      it('Invalid rootpath should throw', async () => {
        expect(
          async () => await build(buildAppOptions(buildLocalOptions('hello/'))),
        ).rejects.toThrow(Error);
      });
      it('Invalid buildFilePath should throw', async () => {
        expect(
          async () =>
            await build(buildAppOptions(buildLocalOptions('hello', () => '/'))),
        ).rejects.toThrow(Error);
      });
    });
  });

  describe('POST /upload', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      jest
        .spyOn(runner, 'runMultipleSequences')
        .mockImplementation(async (sequences) => {
          return sequences;
        });
    });

    it.each(FILE_SERVICES)(
      '%s : Successfully upload a file',
      async (service) => {
        const app = await build(
          buildAppOptions(buildFileServiceOptions(service)),
        );
        const mock = mockCreateUploadFileTask(true);

        const form = new FormData();
        form.append('file', createReadStream(TEXT_FILE_PATH));

        const response = await app.inject({
          method: 'POST',
          url: '/upload',
          payload: form,
          headers: form.getHeaders(),
        });

        expect(response.statusCode).toBe(StatusCodes.OK);
        // run as many sequences as uploaded files
        expect((await response.json()).length).toEqual(1);
        expect(mock).toHaveBeenCalledTimes(1);
      },
    );

    it.each(FILE_SERVICES)(
      '%s : Successfully upload multiple files',
      async (service) => {
        const app = await build(
          buildAppOptions(buildFileServiceOptions(service)),
        );
        const mock = mockCreateUploadFileTask(true);

        const form = new FormData();
        const filepath = path.resolve(__dirname, '../', TEXT_FILE_PATH);
        form.append('file', createReadStream(filepath));
        form.append('file', createReadStream(filepath));

        const response = await app.inject({
          method: 'POST',
          url: '/upload',
          payload: form,
          headers: form.getHeaders(),
        });

        expect(response.statusCode).toBe(StatusCodes.OK);
        // run as many sequences as uploaded files
        expect((await response.json()).length).toEqual(2);
        expect(mock).toHaveBeenCalledTimes(2);
      },
    );

    it.each(FILE_SERVICES)(
      '%s : Run upload pre- and posthooks when defined',
      async (service) => {
        const uploadPreHookTasks = jest.fn();
        const uploadPostHookTasks = jest.fn();

        const app = await build(
          buildAppOptions(buildFileServiceOptions(service), {
            uploadPreHookTasks,
            uploadPostHookTasks,
          }),
        );
        const mock = mockCreateUploadFileTask(true);

        const form = new FormData();
        form.append('file', createReadStream(TEXT_FILE_PATH));

        const response = await app.inject({
          method: 'POST',
          url: '/upload',
          payload: form,
          headers: form.getHeaders(),
        });

        expect(response.statusCode).toBe(StatusCodes.OK);
        // run as many sequences as uploaded files
        expect((await response.json()).length).toEqual(1);
        expect(mock).toHaveBeenCalledTimes(1);
        expect(uploadPreHookTasks).toHaveBeenCalledTimes(1);
        expect(uploadPostHookTasks).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('POST /:id/download', () => {
    beforeEach(() => {
      jest
        .spyOn(runner, 'runSingleSequence')
        .mockImplementation(async (sequence) => {
          return sequence;
        });
    });

    it.each(FILE_SERVICES)('Successfully download a file', async (service) => {
      const mock = mockCreateDownloadFileTask(true);

      const app = await build(
        buildAppOptions(buildFileServiceOptions(service)),
      );

      const id = v4();
      const res = await app.inject({
        method: 'GET',
        url: `/${id}/download`,
      });

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it.each(FILE_SERVICES)('Run upload pre- and posthooks', async (service) => {
      const downloadPreHookTasks = jest
        .fn()
        .mockResolvedValue([new Task({ some: 'value' })]);
      const downloadPostHookTasks = jest
        .fn()
        .mockResolvedValue([new Task({ some: 'value' })]);

      const app = await build(
        buildAppOptions(buildFileServiceOptions(service), {
          downloadPreHookTasks,
          downloadPostHookTasks,
        }),
      );
      const mock = mockCreateDownloadFileTask(true);

      const id = v4();

      const res = await app.inject({
        method: 'GET',
        url: `/${id}/download`,
      });

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(mock).toHaveBeenCalledTimes(1);
      expect(downloadPreHookTasks).toHaveBeenCalledTimes(1);
      expect(downloadPostHookTasks).toHaveBeenCalledTimes(1);
    });
  });
});
