// TODO DELETE : THIS IS AN EXAMPLE

import { FastifyPluginAsync } from 'fastify';
import { Actor, Item } from 'graasp';
import sharp from 'sharp';
import basePlugin from './plugin';
import FileTaskManager from './task-manager';
import { GraaspFileItemOptions } from 'graasp-plugin-file-item';
import {
  DownloadPreHookTasksFunction,
  FILE_METHODS,
  UploadPreHookTasksFunction,
  S3FileItemExtra,
  FileItemExtra,
} from './types';
import { THUMBNAIL_SIZES, THUMBNAIL_FORMAT } from './utils/constants';
import { BuildFilePathFunction } from './types';
import { hash } from './utils/helpers';

const THUMBNAIL_PREFIX = 'thumbnails';

const FILE_ITEM_TYPES = {
  S3: 's3File',
  LOCAL: 'file',
};

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
    local: GraaspFileItemOptions;
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

  const buildFilePath = (itemId, filename) => {
    const filepath = hash(itemId)
      .match(/.{1,8}/g)
      .join('/');
    return `${THUMBNAIL_PREFIX}/${filepath}/${filename}`;
  };

  const fileTaskManager = new FileTaskManager(serviceOptions, serviceMethod);

  // TODO
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
      
      // TODO:  public --> use another plugin?
        const tasks = iMTM.createGetOfItemTaskSequence(member, itemId);
        tasks[1].input = { validatePermission: 'write' };
        return tasks;

    },*/
    downloadPreHookTasks: options.downloadPreHookTasks,
    /*async (itemId, { member, token }) => {

      //  check item has thumbnails
    await itemHasThumbnails(itemId)

      // TODO:  public -> use another plugin?
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
        for (const { name } of THUMBNAIL_SIZES) {
          const filepath = buildFilePath(id, name);
          const task = fileTaskManager.createDeleteFileTask(actor, {
            filepath,
          });
          tasks.push(task);
        }
        // no need to wait for thumbnails to be deleted
        runner.runMultiple(tasks, log);
      }
    },
  );

  const copyItemTaskName = itemTaskManager.getCopyTaskName();
  runner.setTaskPostHookHandler<Item>(
    copyItemTaskName,
    async (item, actor, { log = defaultLogger }, { original }) => {
      const { id } = item; // full copy with new `id`

      // TODO: check item has thumbnails
      if (await itemHasThumbnails(id)) {
        // copy thumbnails for copied item
        const tasks = [];
        for (const { name: filename } of THUMBNAIL_SIZES) {
          const originalPath = buildFilePath(original.id, filename);
          const newFilePath = buildFilePath(id, filename);

          const task = fileTaskManager.createCopyFileTask(actor, {
            newId: id,
            originalPath,
            newFilePath,
            mimetype: THUMBNAIL_FORMAT,
          });
          tasks.push(task);
        }
        // no need to wait
        runner.runMultiple(tasks, log);
      }
    },
  );

  const createTaskName = itemTaskManager.getCreateTaskName();
  runner.setTaskPostHookHandler<Item>(
    createTaskName,
    async (item, actor, { log = defaultLogger }) => {
      const { id, type, extra = {} } = item;

      // generate automatically thumbnails for s3file and file images
      if (
        (type === FILE_ITEM_TYPES.S3 &&
          (extra as S3FileItemExtra)?.s3File?.mimetype.startsWith('image')) ||
        (type === FILE_ITEM_TYPES.LOCAL &&
          (extra as FileItemExtra)?.file?.mimetype.startsWith('image'))
      ) {
        const thumbnails = await createThumbnails(id, actor);
        // create thumbnails for new image
        const tasks = [];
        for (const { size: filename, image } of thumbnails) {
          const task = fileTaskManager.createUploadFileTask(actor, {
            itemId: id,
            file: await image.toBuffer(),
            filename,
            mimetype: THUMBNAIL_FORMAT,
          });
          tasks.push(task);
        }
        await runner.runMultiple(tasks, log);
      }

      // TODO: get app template thumbnails and copy in item
      else if (type === 'app') {
        const appId = 'wefsdv'; // TODO: get app Id

        // copy thumbnails of app template for copied item
        const tasks = [];
        for (const { name } of THUMBNAIL_SIZES) {
          const newFilePath = buildFilePath(id, name);
          const originalPath = `${THUMBNAIL_PREFIX}/${appsTemplateRoot}/${appId}/${name}`;

          const task = fileTaskManager.createCopyFileTask(actor, {
            newId: id,
            originalPath,
            newFilePath,
            mimetype: THUMBNAIL_FORMAT,
          });
          tasks.push(task);
        }
        // no need to wait
        runner.runMultiple(tasks, log);
      }
    },
  );
};

export default plugin;
