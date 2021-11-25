import { StatusCodes } from 'http-status-codes';
import { TaskRunner } from 'graasp-test';
import build from './app';
import { GraaspPluginFileOptions } from '../src/plugin';
import { ServiceMethod } from '../src';

const runner = new TaskRunner();

const S3_SERVICE_DEFAULT_OPTIONS = {
  s3Region: 's3Region',
  s3Bucket: 's3Bucket',
  s3AccessKeyId: 's3AccessKeyId',
  s3SecretAccessKey: 's3SecretAccessKey',
};

const LOCAL_SERVICE_DEFAULT_OPTIONS = {
  storageRootPath: '/tmp/',
};

const LOCAL_SERVICE_BUILD_FILE_PATH = () => 'localrandompath';
const S3_SERVICE_BUILD_FILE_PATH = () => 's3randompath';

const buildBasePluginOptions = ({
  s3 = S3_SERVICE_DEFAULT_OPTIONS,
  local = LOCAL_SERVICE_DEFAULT_OPTIONS,
  buildFilePath,
  serviceMethod = ServiceMethod.LOCAL,
}): GraaspPluginFileOptions => ({
  serviceMethod,
  buildFilePath,
  serviceOptions: {
    s3,
    local,
  },
});

// TODO: do both s3 and local ---> for over config? but mocks might be different

describe('Plugin File Base Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(TaskRunner.prototype, 'runSingleSequence')
      .mockImplementation(async (tasks) => {
        return tasks[0]?.getResult();
      });
  });

  describe.skip('Check Options', () => {});

  describe('POST /upload', () => {
    it('Successfully upload a file', async () => {
      const app = await build({
        runner,
        options: buildBasePluginOptions({
          local: LOCAL_SERVICE_DEFAULT_OPTIONS,
          buildFilePath: LOCAL_SERVICE_BUILD_FILE_PATH,
        }),
      });

      const res = await app.inject({
        method: 'POST',
        url: `/upload`,
      });

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(res.body).toBeTruthy();
    });

    it.skip('Run upload pre- and posthooks', async () => {});
  });

  describe('POST /:id/download', () => {
    it('Successfully download a file', async () => {
      const app = await build({
        runner,
        options: buildBasePluginOptions({
          local: LOCAL_SERVICE_DEFAULT_OPTIONS,
          buildFilePath: LOCAL_SERVICE_BUILD_FILE_PATH,
        }),
      });

      const res = await app.inject({
        method: 'GET',
        url: `/download`,
      });

      // TODO: check return value?
      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(res.body).toBeTruthy();
    });

    it.skip(`Throw NOT FOUND error if corresponding file doesn't exist`, async () => {});

    it.skip('Run upload pre- and posthooks', async () => {});
  });
});
