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
  GraaspFileItemOptions,
  GraaspS3FileItemOptions,
} from './types';

export interface GraaspPluginFileOptions {
  serviceMethod: ServiceMethod; // S3 or local

  buildFilePath: BuildFilePathFunction;

  // use function as pre/post hook to avoid infinite loop with thumbnails
  uploadPreHookTasks?: UploadPreHookTasksFunction;
  uploadPostHookTasks?: UploadPostHookTasksFunction;

  /** The last task should return a filepath */
  downloadPreHookTasks?: DownloadPreHookTasksFunction;
  downloadPostHookTasks?: DownloadPostHookTasksFunction;

  serviceOptions: {
    s3: GraaspS3FileItemOptions;
    local: GraaspFileItemOptions;
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
    // itemType,
    serviceOptions,
    buildFilePath,
    uploadPreHookTasks,
    uploadPostHookTasks,
    downloadPreHookTasks,
    downloadPostHookTasks,
  } = options;

  const { taskRunner: runner } = fastify;

  // TODO: check parameters
  // if (!region || !bucket || !accessKeyId || !secretAccessKey) {
  //     throw new Error('graasp-s3-file-item: mandatory options missing');
  // }

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
    async (request, reply) => {
      const {
        member,
        authTokenSubject,
        query: { id: itemId },
        log,
      } = request;

      const actor = member || { id: authTokenSubject?.member };

      // TODO: multiple ?
      const files = request.files();

      // TODO: upload one file at a time -> client who sends 5 requests?
      const sequences: Task<Actor, unknown>[][] = [];

      for await (const fileObject of files) {
        const { filename, mimetype } = fileObject;
        const file = await fileObject.toBuffer();
        const size = Buffer.byteLength(file);

        const filepath = buildFilePath(itemId, filename);

        const prehookTasks =
          (await uploadPreHookTasks?.(itemId, {
            member,
            token: authTokenSubject,
          })) ?? [];

        const tasks = fileTaskManager.createUploadFileTask(actor, {
          file,
          filename: filepath,
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

  fastify.get<{ Params: IdParam; Querystring: { size: string } }>(
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

      // TODO: check item type is plugin's itemType
      // The last task should return the downloaded Item

      const prehookTasks =
        (await downloadPreHookTasks?.(
          { itemId, filename: size },
          {
            member,
            token: authTokenSubject,
          },
        )) ?? [];

      const task = fileTaskManager.createDownloadFileTask(actor, {
        reply,
        itemId,
      });
      task.getInput = () => ({
        filepath: prehookTasks[prehookTasks.length - 1].getResult(),
      });

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

/**
 *
 * thumbnails: upload, create hooks, download
 * apps: upload, download, create hooks
 * file: upload, download -> this create an item
 *          s3: upload return a link -> apparently you could set up notifications
 *                  ---> or check headobject every x sec
 *          file: upload direct
 *
 *
 *
 * upload id: parent<<<-for creating this is for  OR item
 *          --> callback for creating item?
 *              so this plugin is for managing files but not the related item
 *              everything should be based on the buildPath
 *
 *  file: x/x/x/ -> saved in extra.file.path
 * s3File: x/x/x -> saved in extra.s3File.key
 * thumbnails: thumbnails/hash(id) -> not saved <-
 *
 *
 * thumbnails:
 *  register file (upload/download)
 *      upload prehook: generates THUMBNAIL_SIZES and upload each of them  using task manager
 *
 */
