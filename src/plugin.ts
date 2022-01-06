import { FastifyPluginAsync } from 'fastify';
import { Actor, IdParam, Member, Task } from 'graasp';
import fastifyMultipart from 'fastify-multipart';

import FileTaskManager from './task-manager';
import { AuthTokenSubject, ServiceMethod } from './types';
import { download, upload } from './schema';
import {
  BuildFilePathFunction,
  DownloadPreHookTasksFunction,
  DownloadPostHookTasksFunction,
  UploadPreHookTasksFunction,
  UploadPostHookTasksFunction,
  GraaspLocalFileItemOptions,
  GraaspS3FileItemOptions,
} from './types';

export interface GraaspPluginFileOptions {
  serviceMethod: ServiceMethod; // S3 or local

  /** Function used to create the file path given an item id and a filename
   * The path should NOT start with a /
   */
  buildFilePath: BuildFilePathFunction;

  // use function as pre/post hook to avoid infinite loop with thumbnails
  uploadPreHookTasks?: UploadPreHookTasksFunction;
  uploadPostHookTasks?: UploadPostHookTasksFunction;

  /**
   * Function building tasks running before downloading a file
   * @return array of tasks. The last task should return a filepath
   * */
  downloadPreHookTasks: DownloadPreHookTasksFunction;
  downloadPostHookTasks?: DownloadPostHookTasksFunction;

  serviceOptions: {
    s3: GraaspS3FileItemOptions;
    local: GraaspLocalFileItemOptions;
  };
}

const DEFAULT_MAX_FILE_SIZE = 1024 * 1024 * 250; // 250MB

declare module 'fastify' {
  interface FastifyRequest {
    authTokenSubject: AuthTokenSubject;
    member: Member;
  }
}

const basePlugin: FastifyPluginAsync<GraaspPluginFileOptions> = async (
  fastify,
  options,
) => {
  const {
    serviceMethod,
    serviceOptions,
    buildFilePath,
    uploadPreHookTasks,
    uploadPostHookTasks,
    downloadPreHookTasks,
    downloadPostHookTasks,
  } = options;

  const { taskRunner: runner } = fastify;

  if (!buildFilePath) {
    throw new Error('graasp-plugin-file: buildFilePath is not defined');
  }

  if (
    serviceMethod === ServiceMethod.LOCAL &&
    !serviceOptions?.local?.storageRootPath.startsWith('/')
  ) {
    throw new Error(
      'graasp-plugin-file: local service storageRootPath is malformed',
    );
  }

  if (serviceMethod === ServiceMethod.S3) {
    if (buildFilePath('itemId', 'filename').startsWith('/')) {
      throw new Error('graasp-plugin-file: buildFilePath is not well defined');
    }

    if (
      !serviceOptions?.s3?.s3Region ||
      !serviceOptions?.s3?.s3Bucket ||
      !serviceOptions?.s3?.s3AccessKeyId ||
      !serviceOptions?.s3?.s3SecretAccessKey
    ) {
      throw new Error(
        'graasp-plugin-file: mandatory options for s3 service missing',
      );
    }
  }

  fastify.register(fastifyMultipart, {
    limits: {
      // fieldNameSize: 0,             // Max field name size in bytes (Default: 100 bytes).
      // fieldSize: 1000000,           // Max field value size in bytes (Default: 1MB).
      fields: 0, // Max number of non-file fields (Default: Infinity).
      fileSize: DEFAULT_MAX_FILE_SIZE, // For multipart forms, the max file size (Default: Infinity).
      files: 5, // Max number of file fields (Default: Infinity).
      // headerPairs: 2000             // Max number of header key=>value pairs (Default: 2000 - same as node's http).
    },
  });

  const fileTaskManager = new FileTaskManager(serviceOptions, serviceMethod);

  fastify.post<{ Querystring: IdParam }>(
    '/upload',
    { schema: upload },
    async (request) => {
      const {
        member,
        authTokenSubject,
        query: { id: itemId },
        log,
      } = request;

      const actor = member || { id: authTokenSubject?.member };

      const files = request.files();
      const sequences: Task<Actor, unknown>[][] = [];

      for await (const fileObject of files) {
        const { filename, mimetype } = fileObject;
        const file = await fileObject.toBuffer();
        const size = Buffer.byteLength(file);

        const filepath = buildFilePath(itemId, filename);

        const prehookTasks =
          (await uploadPreHookTasks?.(
            { parentId: itemId, mimetype },
            {
              member,
              token: authTokenSubject,
            },
          )) ?? [];

        const tasks = fileTaskManager.createUploadFileTask(actor, {
          file,
          filepath,
          mimetype,
        });

        const posthookTasks =
          (await uploadPostHookTasks?.(
            { file, filename, filepath, mimetype, size, itemId },
            { member, token: authTokenSubject },
          )) ?? [];

        sequences.push([...prehookTasks, tasks, ...posthookTasks]);
      }

      return runner.runMultipleSequences(sequences, log);
    },
  );

  fastify.get<{ Params: IdParam; Querystring: { size?: string } }>(
    '/:id/download',
    { schema: download },
    async (request, reply) => {
      const {
        member,
        authTokenSubject,
        params: { id: itemId },
        query: { size },
        log,
      } = request;

      const actor = member || { id: authTokenSubject?.member };

      const prehookTasks = await downloadPreHookTasks(
        { itemId, filename: size },
        {
          member,
          token: authTokenSubject,
        },
      );

      const task = fileTaskManager.createDownloadFileTask(actor, {
        reply,
        itemId,
      });
      // get filepath and mimetype from last task
      task.getInput = () => prehookTasks[prehookTasks.length - 1].getResult();
      const posthookTasks =
        (await downloadPostHookTasks?.(itemId, {
          member,
          token: authTokenSubject,
        })) ?? [];

      return await runner.runSingleSequence(
        [...prehookTasks, task, ...posthookTasks],
        log,
      );
    },
  );
};

export default basePlugin;
