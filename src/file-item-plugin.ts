const ORIGINAL_FILENAME_TRUNCATE_LIMIT = 100;
const randomHexOf4 = () =>
  ((Math.random() * (1 << 16)) | 0).toString(16).padStart(4, '0');

import { FastifyPluginAsync } from 'fastify';
import FileTaskManager from './task-manager';
import path from 'path';

import basePlugin from './plugin';
import { FILE_METHODS, FileItemExtra, S3FileItemExtra } from './types';
import { Item, UnknownExtra } from 'graasp';
import graaspFileUploadLimiter from 'graasp-file-upload-limiter';
import { createHash } from 'crypto';
export interface GraaspPluginFileItemOptions {
  shouldLimit: boolean;
  serviceMethod: FILE_METHODS;

  //   buildFilePath: (itemId: string, filename) => string;

  storageRootPath: string;

  serviceOptions: {
    s3: {
      s3Region: string;
      s3Bucket: string;
      s3AccessKeyId: string;
      s3SecretAccessKey: string;
      s3UseAccelerateEndpoint: boolean;
      s3Expiration: number;
      // s3Instance, // for test
    };
    local: {};
  };
}

const S3_FILE_ITEM_TYPE = 's3File';
const FILE_ITEM_TYPE = 'file';

const plugin: FastifyPluginAsync<GraaspPluginFileItemOptions> = async (
  fastify,
  options,
) => {
  const { shouldLimit, serviceMethod, serviceOptions, storageRootPath } =
    options;
  const {
    items: { taskManager: itemTaskManager },
    itemMemberships: { taskManager: iMTM },
    taskRunner: runner,
  } = fastify;

  // CHECK PARAMS
  if (
    serviceMethod === FILE_METHODS.LOCAL &&
    (!storageRootPath.endsWith('/') || !storageRootPath.startsWith('/'))
  ) {
    throw new Error(
      'graasp-plugin-file: local storage service root path is malformed',
    );
  }

  if (serviceMethod === FILE_METHODS.S3) {
    if (!storageRootPath.endsWith('/')) {
      throw new Error(
        'graasp-plugin-file: s3 storage service root path is malformed',
      );
    }

    if (
      !serviceOptions?.s3?.s3Region ||
      !serviceOptions?.s3?.s3Bucket ||
      !serviceOptions?.s3?.s3AccessKeyId ||
      !serviceOptions?.s3?.s3SecretAccessKey
    ) {
      throw new Error('graasp-s3-file-item: mandatory options missing');
    }
  }

  // define current item type
  const SERVICE_ITEM_TYPE =
    serviceMethod === FILE_METHODS.S3 ? S3_FILE_ITEM_TYPE : FILE_ITEM_TYPE;

  const hash = (id: string): string =>
    createHash('sha256').update(id).digest('hex');

    // we cannot use a hash based on the itemid because we don't have an item id 
    // when we upload the file
  const buildFilePath = (itemId: string, _filename: string) => {
    // split in 4
    const filepath = `${randomHexOf4()}/${randomHexOf4()}/${randomHexOf4()}`
    
    // hash(itemId)
    //   .match(/.{1,8}/g)
    //   .join('/');
    return `${storageRootPath}${filepath}`;
  };

  const fileTaskManager = new FileTaskManager(
    options,
    serviceMethod,
    buildFilePath,
  );

  // TODO: this should not be counted in thumbnails?
  if (shouldLimit) {
    fastify.register(graaspFileUploadLimiter, {
      sizePath: `${SERVICE_ITEM_TYPE}.size`,
      type: SERVICE_ITEM_TYPE,
    });
  }

  fastify.register(basePlugin, {
    buildFilePath,
    serviceMethod,

    uploadPreHookTasks: async (parentId, { member, token }) => {
      // check parent permission
      // !!!!!! item could be empty if want to upload file in root
      // check has permission on parent id
      // await itemMembershipService.canRead(member.id, item as Item, db.pool);
      const tasks = iMTM.createGetOfItemTaskSequence(member, parentId);
      tasks[1].input = { validatePermission: 'write' };
      return tasks;
    },

    uploadPostHookTasks: async (
      { file, filename, itemId: parentId, filepath, size, mimetype },
      { member, token },
    ) => {
      // create item

      // get metadata from uploadtask
      const name = filename.substring(0, ORIGINAL_FILENAME_TRUNCATE_LIMIT);
      const data = {
        name,
        type: SERVICE_ITEM_TYPE,
        extra: {
          [SERVICE_ITEM_TYPE]: {
            name: filename,
            path: filepath,
            size,
            mimetype,
          },
        },
      };
      const tasks = itemTaskManager.createCreateTaskSequence(
        member,
        data,
        parentId,
      );

      return tasks;
    },

    downloadPreHookTasks: async ({ itemId }, { member, token }) => {
      // check has permission on item id
      // await itemMembershipService.canRead(member.id, item as Item, db.pool);
      const tasks = itemTaskManager.createGetTaskSequence(member, itemId);
      return tasks;
    },

    downloadPostHookTasks: async (itemId, { member, token }) => {
      return [];
    },

    serviceOptions,
  });

  const getFilePathFromItemExtra = (extra: UnknownExtra) => {
    switch (serviceMethod) {
      case FILE_METHODS.S3:
        return path.basename((extra as S3FileItemExtra).s3File.path);
      case FILE_METHODS.LOCAL:
      default:
        return path.basename((extra as FileItemExtra).file.path);
    }
  };

  // register post delete handler to remove the s3 file object after item delete
  const deleteFileTaskName = itemTaskManager.getDeleteTaskName();
  runner.setTaskPostHookHandler<Item>(
    deleteFileTaskName,
    async ({ id, type, extra }, _actor) => {
      if (!id || type !== SERVICE_ITEM_TYPE) return;
      const filename = getFilePathFromItemExtra(extra);

      const task = fileTaskManager.createDeleteFileTask(
        { id },
        { itemId: id, filename },
      );
      await runner.runSingle(task);
    },
  );

  const copyItemTaskName = itemTaskManager.getCopyTaskName();
  runner.setTaskPreHookHandler<Item>(
    copyItemTaskName,
    async (item, actor, {}, { original }) => {
      const { id, type, extra = {} } = item; // full copy with new `id`

      // copy file only for file item types
      if (!id || type !== SERVICE_ITEM_TYPE) return;

      const filename = getFilePathFromItemExtra(extra); /// <- build random filename?
      const originalPath = buildFilePath(original.id, filename);
      const newFilePath = buildFilePath(item.id, filename);

      const task = fileTaskManager.createCopyFileTask(actor, {
        newId: item.id,
        originalPath,
        newFilePath,
        filename,
      });
      const filepath = (await runner.runSingle(task)) as string;

      // update item copy's 'extra' <<<- be careful what's saved in this extra
      if (serviceMethod === FILE_METHODS.LOCAL) {
        // TODO: s3file is key????? keep key ??
        (item.extra as S3FileItemExtra).s3File.path = filepath;
      } else {
        (item.extra as FileItemExtra).file.path = filepath;
      }
    },
  );









};

export default plugin;
