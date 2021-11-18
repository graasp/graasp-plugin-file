// TODO DELETE : THIS IS AN EXAMPLE

import { FastifyPluginAsync } from 'fastify';
import { Actor, Item } from 'graasp';
import sharp from 'sharp';
import basePlugin from './plugin';
import FileTaskManager from './task-manager';
import { FileItemExtra } from 'graasp-plugin-file-item';
import { S3FileItemExtra } from 'graasp-plugin-s3-file-item';
import {
  DownloadPreHookTasksFunction,
  FILE_METHODS,
  UploadPreHookTasksFunction,
} from './types';
import { THUMBNAIL_SIZES, THUMBNAIL_FORMAT } from './utils/constants';
import { BuildFilePathFunction } from './types';
import { createHash } from 'crypto';

// THUMBNAIL ITEM PLUGIN

export interface GraaspPluginFileItemOptions {
  serviceMethod: FILE_METHODS;

  buildFilePath: BuildFilePathFunction;

  itemType: string; // ITEM_TYPES,

  // TODO: use prehook in uploadPrehook.... for public
  uploadPreHookTasks: UploadPreHookTasksFunction;
  downloadPreHookTasks: DownloadPreHookTasksFunction;

  // pluginStoragePrefix: string;
  appsTemplateRoot: string; // apps/template

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

const plugin: FastifyPluginAsync<GraaspPluginFileItemOptions> = async (
  fastify,
  options,
) => {
  const { serviceMethod, serviceOptions, appsTemplateRoot } = options;
  const {
    items: { taskManager: itemTaskManager },
    taskRunner: runner,
    log: defaultLogger,
  } = fastify;

  const hash = (id: string): string =>
    createHash('sha256').update(id).digest('hex');

  const buildFilePath = (itemId, filename) => {
    const filepath = hash(itemId)
      .match(/.{1,8}/g)
      .join('/');
    return `thumbnails/${filepath}/${filename}`;
  };

  const fileTaskManager = new FileTaskManager(
    serviceOptions,
    serviceMethod,
    buildFilePath,
  );

  const itemHasThumbnails = async (id: string) => {
    // check item has thumbnails
    const hasThumbnails = true;
    return hasThumbnails;
  };

  const createThumbnails = async (itemId: string, actor: Actor) => {
    // get original image
    const filename = buildFilePath(itemId, undefined); //  TODO: get filename from item extra
    const task = fileTaskManager.createGetFileBufferTask(actor, { filename });
    const originalImage = await runner.runSingle(task);

    // generate sizes for given image
    const files = THUMBNAIL_SIZES.map(({ name, width }) => ({
      size: name,
      image: sharp(originalImage).resize({ width }).toFormat(THUMBNAIL_FORMAT),
    }));

    return files;
  };

  fastify.register(basePlugin, {
    serviceMethod, // S3 or local
    buildFilePath: buildFilePath,
    serviceOptions,

    // use function as pre/post hook to avoid infinite loop with thumbnails
    uploadPreHookTasks: options.uploadPreHookTasks,
    /*async (itemId, { member, token }) => {
      
      // TODO:  public ???? --> use another plugin?
        const tasks = iMTM.createGetOfItemTaskSequence(member, itemId);
        tasks[1].input = { validatePermission: 'write' };
        return tasks;

    },*/
    downloadPreHookTasks: options.downloadPreHookTasks,
    /*async (itemId, { member, token }) => {

      //  check item has thumbnails
    await itemHasThumbnails(itemId)

      // TODO:  public ???? --> use another plugin?
        const tasks = iMTM.createGetOfItemTaskSequence(member, itemId);
        tasks[1].input = { validatePermission: 'write' };
        return tasks;
    },*/
  });

  const deleteFileTaskName = itemTaskManager.getDeleteTaskName();
  runner.setTaskPostHookHandler<Item>(
    deleteFileTaskName,
    async ({ id, type }, actor, { log = defaultLogger }) => {
      //  check item has thumbnails
      if (await itemHasThumbnails(id)) {
        // delete thumbnails for item
        // TODO: optimize
        const tasks = [];
        for (const { name: filename } of THUMBNAIL_SIZES) {
          const task = fileTaskManager.createDeleteFileTask(actor, {
            itemId: id,
            filename,
          });
          tasks.push(task);
        }
        // no need to wait for thumbnails to be deleted
        runner.runMultiple(tasks);
      }
    },
  );

  const copyItemTaskName = itemTaskManager.getCopyTaskName();
  runner.setTaskPostHookHandler<Item>(
    copyItemTaskName,
    async (item, actor, _data, { original }) => {
      const { id, type, extra = {} } = item; // full copy with new `id`

      // TODO: check item has thumbnails
      if (await itemHasThumbnails(id)) {
        // copy thumbnails for copied item
        for (const { name: filename } of THUMBNAIL_SIZES) {
          const originalPath = buildFilePath(original.id, filename);
          const newFilePath = buildFilePath(id, filename);

          fileTaskManager.createCopyFileTask(actor, {
            newId: id,
            filename: filename,
            originalPath,
            newFilePath,
          });
        }
      }
    },
  );

  const createTaskName = itemTaskManager.getCreateTaskName();
  runner.setTaskPostHookHandler<Item>(
    createTaskName,
    async (item, actor, _data, { original }) => {
      const { id, type, extra = {} } = item;

      // generate automatically thumbnails for s3file and file images
      // TODO : images
      if (
        (type === 's3File' &&
          (extra as S3FileItemExtra)?.s3File?.contenttype.startsWith('image')) ||
        (type === 'file' &&
          (extra as FileItemExtra)?.file?.mimetype.startsWith('image'))
      ) {
        const thumbnails = await createThumbnails(id, actor);
        // copy thumbnails for copied item
        for (const { size: filename, image } of thumbnails) {
          fileTaskManager.createUploadFileTask(actor, {
            itemId: item.id,
            file: await image.toBuffer(),
            filename,
          });
        }
      }

      // TODO: get app template thumbnails and copy in item
      if (type === 'app') {
        const appId = 'wefsdv'; // TODO: get app Id
        const thumbnails = await createThumbnails(id, actor);
        // copy thumbnails for copied item
        for (const { size: filename, image } of thumbnails) {
          const newFilePath = buildFilePath(id, filename);
          const originalPath = `thumbnails/${appsTemplateRoot}/${appId}`;

          fileTaskManager.createCopyFileTask(actor, {
            filename,
            newId: id,
            originalPath,
            newFilePath,
          });
        }
      }
    },
  );
};

export default plugin;
