import fastify, { FastifyInstance } from 'fastify';
import { GraaspS3FileItemOptions, GraaspFileItemOptions } from '../src/types';
import {
  ItemMembershipTaskManager,
  ItemTaskManager,
  TaskRunner,
} from 'graasp-test';
import {
  AuthTokenSubject,
  BuildFilePathFunction,
  DownloadPostHookTasksFunction,
  DownloadPreHookTasksFunction,
  ServiceMethod,
  UploadPostHookTasksFunction,
  UploadPreHookTasksFunction,
} from '../src/types';

import plugin from '../src/index';
import { DISABLE_S3, GRAASP_ACTOR, ROOT_PATH, S3_OPTIONS } from './constants';
import { GraaspPluginFileOptions } from '../src/plugin';

const schemas = {
  $id: 'http://graasp.org/',
  definitions: {
    uuid: {
      type: 'string',
      pattern:
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    },
    idParam: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { $ref: '#/definitions/uuid' },
      },
      additionalProperties: false,
    },
  },
};

const build = async ({
  runner,
  options,
}: {
  runner: TaskRunner;
  S3Options?: GraaspS3FileItemOptions;
  FSOptions?: GraaspFileItemOptions;
  LocalOptions?: GraaspFileItemOptions;

  options: GraaspPluginFileOptions;
}): Promise<FastifyInstance> => {
  const app = fastify();
  app.addSchema(schemas);

  app.decorateRequest('member', GRAASP_ACTOR);
  app.decorate('taskRunner', runner);
  await app.register(plugin, options);

  return app;
};
export default build;
