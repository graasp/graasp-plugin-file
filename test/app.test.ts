import FormData from 'form-data';
import fs, { Stats, createReadStream } from 'fs';
import { StatusCodes } from 'http-status-codes';
import path from 'path';
import { v4 } from 'uuid';

import { ItemType } from '@graasp/sdk';
import { Task, TaskRunner } from 'graasp-test';

import { BuildFilePathFunction } from '../src/types';
import { MAX_NB_TASKS_IN_PARALLEL } from '../src/utils/constants';
import build from './app';
import {
  DEFAULT_BUILD_FILE_PATH,
  DEFAULT_S3_OPTIONS,
  FILE_TYPES,
  TEXT_FILE_PATH,
  buildDefaultLocalOptions,
} from './fixtures';
import { mockCreateDownloadFileTask, mockCreateUploadFileTask } from './mock';

const runner = new TaskRunner();

const buildAppOptions = (
  { fileItemType, fileConfigurations, buildFilePath },
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
    fileItemType,
    fileConfigurations,
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
  fileItemType: ItemType.LOCAL_FILE,
  fileConfigurations: {
    local: buildDefaultLocalOptions(storageRootPath),
  },
  buildFilePath: buildFilePath ?? DEFAULT_BUILD_FILE_PATH,
});

const buildS3Options = (
  s3 = DEFAULT_S3_OPTIONS,
  buildFilePath?: BuildFilePathFunction,
) => ({
  fileItemType: ItemType.S3_FILE,
  fileConfigurations: {
    s3,
  },
  buildFilePath: buildFilePath ?? DEFAULT_BUILD_FILE_PATH,
});

const buildFileServiceOptions = (service) => {
  if (service === ItemType.LOCAL_FILE) {
    return buildLocalOptions();
  } else if (service === ItemType.S3_FILE) {
    return buildS3Options();
  }
  throw new Error('Service is not defined');
};

const filepath = path.resolve(__dirname, '../', TEXT_FILE_PATH);
const fileStream = createReadStream(filepath);

jest.spyOn(fs, 'createReadStream').mockImplementation(() => fileStream);

describe('Plugin File Base Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(TaskRunner.prototype, 'runSingleSequence')
      .mockImplementation(async (tasks) => {
        return tasks[0]?.getResult?.();
      });
  });

  describe('Options', () => {
    beforeEach(() => {
      jest.spyOn(runner, 'setTaskPostHookHandler').mockImplementation(() => {
        // do nothing
      });
      jest.spyOn(runner, 'setTaskPreHookHandler').mockImplementation(() => {
        // do nothing
      });
    });

    describe('Local', () => {
      it('Valid options should resolve', async () => {
        const app = await build(buildAppOptions(buildLocalOptions()));
        expect(app).toBeTruthy();

        const app1 = await build(buildAppOptions(buildLocalOptions('/')));
        expect(app1).toBeTruthy();

        const app2 = await build(buildAppOptions(buildLocalOptions('/hello')));
        expect(app2).toBeTruthy();

        const app3 = await build(buildAppOptions(buildLocalOptions('/hello/')));
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

  describe.each(FILE_TYPES)('POST /upload for %s', (service) => {
    // important to define form for each test! We cannot reuse them
    // tests don't pass if they are define within the tests themselves
    const multipleFilesForm = new FormData();
    multipleFilesForm.append('file', fileStream);
    multipleFilesForm.append('file', fileStream);
    const moreThanMaxForm = new FormData();
    for (let i = 0; i <= MAX_NB_TASKS_IN_PARALLEL * 2; i++) {
      moreThanMaxForm.append('file', fileStream);
    }
    const oneFileForm = new FormData();
    oneFileForm.append('file', fileStream);
    const oneFileForm1 = new FormData();
    oneFileForm1.append('file', fileStream);

    beforeEach(() => {
      jest.clearAllMocks();

      jest
        .spyOn(runner, 'runMultipleSequences')
        .mockImplementation(async (sequences) => {
          return sequences;
        });
      jest
        .spyOn(fs, 'statSync')
        .mockImplementation(() => ({ size: 123 } as Stats));
    });

    it(`Upload runs in max ${MAX_NB_TASKS_IN_PARALLEL} tasks in parallel`, async () => {
      const app = await build(
        buildAppOptions(buildFileServiceOptions(service)),
      );

      mockCreateUploadFileTask(true);

      const response = await app.inject({
        method: 'POST',
        url: '/upload',
        payload: moreThanMaxForm,
        headers: moreThanMaxForm.getHeaders(),
      });

      await app.close();
      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(await response.json().length).toBeLessThanOrEqual(
        MAX_NB_TASKS_IN_PARALLEL,
      );
    });

    it('Successfully upload a file', async () => {
      const app = await build(
        buildAppOptions(buildFileServiceOptions(service)),
      );
      const mock = mockCreateUploadFileTask(true);

      const response = await app.inject({
        method: 'POST',
        url: '/upload',
        payload: oneFileForm1,
        headers: oneFileForm1.getHeaders(),
      });

      await app.close();
      expect(response.statusCode).toBe(StatusCodes.OK);
      // run as many sequences as uploaded files
      expect((await response.json()).length).toEqual(1);
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it('Successfully upload multiple files', async () => {
      const app = await build(
        buildAppOptions(buildFileServiceOptions(service)),
      );
      const mock = mockCreateUploadFileTask(true);

      const response = await app.inject({
        method: 'POST',
        url: '/upload',
        payload: multipleFilesForm,
        headers: multipleFilesForm.getHeaders(),
      });

      await app.close();
      expect(response.statusCode).toBe(StatusCodes.OK);
      // run as many sequences as uploaded files
      expect((await response.json()).length).toEqual(2);
      expect(mock).toHaveBeenCalledTimes(2);
    });

    it('Run upload pre- and posthooks when defined', async () => {
      const uploadPreHookTasks = jest.fn();
      const uploadPostHookTasks = jest.fn();

      const app = await build(
        buildAppOptions(buildFileServiceOptions(service), {
          uploadPreHookTasks,
          uploadPostHookTasks,
        }),
      );
      const mock = mockCreateUploadFileTask(true);

      jest
        .spyOn(fs, 'statSync')
        .mockImplementation(() => ({ size: 123 } as Stats));

      const response = await app.inject({
        method: 'POST',
        url: '/upload',
        payload: oneFileForm,
        headers: oneFileForm.getHeaders(),
      });

      await app.close();
      expect(response.statusCode).toBe(StatusCodes.OK);
      // run as many sequences as uploaded files
      expect((await response.json()).length).toEqual(1);
      expect(mock).toHaveBeenCalledTimes(1);
      expect(uploadPreHookTasks).toHaveBeenCalledTimes(1);
      expect(uploadPostHookTasks).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /:id/download', () => {
    beforeEach(() => {
      jest
        .spyOn(runner, 'runSingleSequence')
        .mockImplementation(async (sequence) => {
          return sequence;
        });
    });

    it.each(FILE_TYPES)('Successfully download a file', async (service) => {
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

    it.each(FILE_TYPES)('Run upload pre- and posthooks', async (service) => {
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
