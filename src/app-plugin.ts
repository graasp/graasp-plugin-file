import { Item } from 'graasp';
import { FastifyPluginAsync } from 'fastify';
import basePlugin from './plugin';
import FileTaskManager from './task-manager';
import { FILE_METHODS } from './types';
import { GraaspFileItemOptions } from 'graasp-plugin-file-item';
import { hash } from './utils/helpers';

const APP_ITEM_TYPE = 'app';

export interface GraaspPluginFileItemOptions {
  shouldLimit: boolean;
  method: FILE_METHODS;

  buildFilePath: (itemId: string, filename) => string;

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
    local: GraaspFileItemOptions;
  };
}

const plugin: FastifyPluginAsync<GraaspPluginFileItemOptions> = async (
  fastify,
  options,
) => {
  const { method, options: methodOptions, buildFilePath } = options;
  const {
    items: { taskManager: iTM, dbService: itemService },
    itemMemberships: { taskManager: iMTM },
    taskRunner: runner,
    log: defaultLogger,
  } = fastify;

  const fileTaskManager = new FileTaskManager(methodOptions, method);

  fastify.register(basePlugin, {
    buildFilePath: (itemId: string) => `apps/${hash(itemId)}/files`,
    serviceMethod: method,

    // TODO: <<<<- Do not need?
    // uploadPreHookTasks: async (parentId, { member, token }) => {
    // iTM.createCreateTask({ id: token.member }, {
    //   data: {
    //     ...data
    //   },
    //   type: 'file',
    //   visibility: 'member',
    // },
    //   parent,
    //   token
    // )
    // },
    downloadPreHookTasks: async ({ itemId }, { member, token }) => {
      // TODO: RETURN FILEPATH
      // check has permission on item id
      // ----> public ???
      const tasks = iTM.createGetTaskSequence(member, itemId);
      return tasks;
    },
    serviceOptions: methodOptions,
  });

  // remove files uploaded by the app
  const deleteFileTaskName = iTM.getDeleteTaskName();
  runner.setTaskPostHookHandler<Item>(
    deleteFileTaskName,
    async ({ id, type }, actor, { log = defaultLogger }) => {
      if (!id || APP_ITEM_TYPE !== type) return;
      // filename is not used???????
      const folderPath = buildFilePath(id, 'filename');
      const task = fileTaskManager.createDeleteFolderTask(actor, {
        folderPath,
      });

      await runner.runSingle(task, log);
    },
  );
};

export default plugin;
