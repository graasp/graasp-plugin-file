import fs from 'fs';

import fastifyMultipart from '@fastify/multipart';
import { FastifyPluginAsync } from 'fastify';

import {
  Actor,
  FileItemType,
  IdParam,
  ItemType,
  LocalFileConfiguration,
  S3FileConfiguration,
  Task,
  spliceIntoChunks,
} from '@graasp/sdk';

import { download, upload } from './schema';
import FileTaskManager from './task-manager';
import {
  BuildFilePathFunction,
  DownloadPostHookTasksFunction,
  DownloadPreHookTasksFunction,
  UploadPostHookTasksFunction,
  UploadPreHookTasksFunction,
} from './types';
import {
  DEFAULT_MAX_FILE_SIZE,
  MAX_NB_TASKS_IN_PARALLEL,
  MAX_NUMBER_OF_FILES_UPLOAD,
} from './utils/constants';

export interface GraaspPluginFileOptions {
  shouldRedirectOnDownload?: boolean; // redirect value on download
  uploadMaxFileNb?: number; // max number of files to upload at a time
  maxFileSize?: number; // max size for an uploaded file in bytes
  fileItemType: FileItemType; // S3 or local

  /** Function used to create the file path given an item id and a filename
   * The path should NOT start with a /
   */
  buildFilePath: BuildFilePathFunction;

  // use function as pre/post hook to avoid infinite loop with thumbnails
  uploadPreHookTasks?: UploadPreHookTasksFunction;
  uploadPostHookTasks?: UploadPostHookTasksFunction;
  // eslint-disable-next-line @typescript-eslint/ban-types
  uploadOnResponse?: Function;

  /**
   * Function building tasks running before downloading a file
   * @return array of tasks. The last task should return a filepath
   * */
  downloadPreHookTasks: DownloadPreHookTasksFunction;
  downloadPostHookTasks?: DownloadPostHookTasksFunction;

  fileConfigurations: {
    s3: S3FileConfiguration;
    local: LocalFileConfiguration;
  };
}

const basePlugin: FastifyPluginAsync<GraaspPluginFileOptions> = async (
  fastify,
  options,
) => {
  const {
    fileItemType,
    fileConfigurations,
    buildFilePath,
    uploadPreHookTasks,
    uploadPostHookTasks,
    uploadOnResponse,
    downloadPreHookTasks,
    downloadPostHookTasks,
    uploadMaxFileNb = MAX_NUMBER_OF_FILES_UPLOAD,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    shouldRedirectOnDownload = true,
  } = options;

  const { taskRunner: runner } = fastify;

  if (!buildFilePath) {
    throw new Error('graasp-plugin-file: buildFilePath is not defined');
  }

  if (
    fileItemType === ItemType.LOCAL_FILE &&
    !fileConfigurations?.local?.storageRootPath.startsWith('/')
  ) {
    throw new Error(
      'graasp-plugin-file: local service storageRootPath is malformed',
    );
  }

  if (fileItemType === ItemType.S3_FILE) {
    if (buildFilePath('itemId', 'filename').startsWith('/')) {
      throw new Error('graasp-plugin-file: buildFilePath is not well defined');
    }

    if (
      !fileConfigurations?.s3?.s3Region ||
      !fileConfigurations?.s3?.s3Bucket ||
      !fileConfigurations?.s3?.s3AccessKeyId ||
      !fileConfigurations?.s3?.s3SecretAccessKey
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
      fields: 5, // Max number of non-file fields (Default: Infinity).
      // allow some fields for app data and app setting
      fileSize: maxFileSize, // For multipart forms, the max file size (Default: Infinity).
      files: uploadMaxFileNb, // Max number of file fields (Default: Infinity).
      // headerPairs: 2000             // Max number of header key=>value pairs (Default: 2000 - same as node's http).
    },
  });

  const fileTaskManager = new FileTaskManager(fileConfigurations, fileItemType);

  fastify.route<{ Querystring: IdParam; Body: any }>({
    method: 'POST',
    url: '/upload',
    schema: upload,
    handler: async (request) => {
      const {
        member,
        authTokenSubject,
        query: { id: itemId },
        log,
      } = request;

      const actor = member || { id: authTokenSubject?.member };

      // const files = request.files();
      const sequences: Task<Actor, unknown>[][] = [];

      // files are saved in temporary folder in disk, they are removed when the response ends
      // necessary to get file size -> can use stream busboy only otherwise
      const files = await request.saveRequestFiles();

      for (const fileObject of files) {
        const { filename, mimetype, fields, filepath: tmpPath } = fileObject;
        const file = fs.createReadStream(tmpPath);
        const { size } = fs.statSync(tmpPath);
        const filepath = buildFilePath(itemId, filename);

        // compute body data from file's fields
        const fileBody = Object.fromEntries(
          Object.keys(fields).map((key) => [
            key,
            (fields[key] as unknown as { value: string })?.value,
          ]),
        );

        const prehookTasks =
          (await uploadPreHookTasks?.(
            { parentId: itemId, mimetype, size },
            {
              member,
              token: authTokenSubject,
            },
            fileBody,
          )) ?? [];
        const task = fileTaskManager.createUploadFileTask(actor, {
          file,
          filepath,
          mimetype,
          size,
        });

        const posthookTasks =
          (await uploadPostHookTasks?.(
            { file, filename, filepath, mimetype, itemId, size },
            { member, token: authTokenSubject },
            fileBody,
          )) ?? [];

        sequences.push([...prehookTasks, task, ...posthookTasks]);
      }

      // chunk to run in parallel
      const chunkedTasks = spliceIntoChunks<typeof sequences[0]>(
        sequences,
        Math.ceil(sequences.length / MAX_NB_TASKS_IN_PARALLEL),
      ).map((s) => s.flat());
      return runner.runMultipleSequences(chunkedTasks, log);
    },
    onResponse: async (request, reply) => {
      uploadOnResponse?.(request, reply);
    },
  });

  fastify.get<{ Params: IdParam; Querystring: { size?: string; replyUrl?: boolean } }>(
    '/:id/download',
    { schema: download },
    async (request, reply) => {
      const {
        member,
        authTokenSubject,
        params: { id: itemId },
        query: { size, replyUrl },
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
        reply: shouldRedirectOnDownload ? reply : null,
        itemId,
        replyUrl,
      });
      // get filepath and mimetype from last task
      task.getInput = () => prehookTasks[prehookTasks.length - 1].getResult();
      const posthookTasks =
        (await downloadPostHookTasks?.(itemId, {
          member,
          token: authTokenSubject,
        })) ?? [];
      if (posthookTasks.length) {
        posthookTasks[posthookTasks.length - 1].getResult = () => task.result;
      }

      return await runner.runSingleSequence(
        [...prehookTasks, task, ...posthookTasks],
        log,
      );
    },
  );
};

export default basePlugin;
