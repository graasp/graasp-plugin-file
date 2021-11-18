// APP PLUGIN - TO REMOVE
/*
import {Item} from 'graasp'

const randomHexOf4 = () =>
  ((Math.random() * (1 << 16)) | 0).toString(16).padStart(4, '0');

  `${randomHexOf4()}/${randomHexOf4()}/${randomHexOf4()}-${Date.now()}`;

import { FastifyPluginAsync } from 'fastify';
import basePlugin from './plugin';
import FileTaskManager from './task-manager';
import { FILE_METHODS } from './types';

export interface GraaspPluginFileItemOptions {
  shouldLimit: boolean;
  method: FILE_METHODS;
  // enableItemsHooks: true,

  buildFilePath: (itemId: string, filename) => string;

  itemType: string; // ITEM_TYPES

  pluginStoragePrefix: string;

  options: {
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
  const {
    shouldLimit,
    method,
    itemType,
    options: methodOptions,
    buildFilePath,
  } = options;
  const {
    items: { taskManager, dbService: itemService },
    taskRunner: runner,
    log: defaultLogger,
  } = fastify;

  const fileTaskManager = new FileTaskManager(
    methodOptions,
    method,
    buildFilePath,
  );

  fastify.register(basePlugin, {
    buildFilePath: (itemId: string) => `apps/${hash(itemId)}/files`,
    serviceMethod: method,

    uploadPreHookTasks: async (parentId, { member, token }) => {
        taskManager.createCreateTask({ id: token.member }, {
            data: {
              ...data
            },
            type: 'file',
            visibility: 'member',
            },
            parent,
            token
          )
    },
    downloadPreHookTasks: async (itemId, { member, token }) => {
      // check has permission on item id
      // await itemMembershipService.canRead(member.id, item as Item, db.pool);
      taskManager.createGetFileTask({ id: token.member }, id, token)
      return tasks;
    },
    serviceOptions: methodOptions,
  });


  // remove files uploaded by the app
  const deleteFileTaskName = taskManager.getDeleteTaskName();
  runner.setTaskPostHookHandler<Item>(
    deleteFileTaskName,
    async ({ id, type }, _actor, { log = defaultLogger }) => {
      if (!id || itemType !== type) return;
      const folderPath = buildFilePath(id)
      const task = fileTaskManager.createDeleteFolderTask({ folderPath });

      await runner.runSingle(task, log);

    },
  );

};

export default plugin;*/
