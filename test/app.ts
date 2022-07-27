import fastify from 'fastify';

import { Actor, TaskRunner } from '@graasp/sdk';

import plugin, { GraaspPluginFileOptions } from '../src/plugin';

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
  runner: TaskRunner<Actor>;
  options?: GraaspPluginFileOptions;
}) => {
  const app = fastify();
  app.addSchema(schemas);

  app.decorate('taskRunner', runner);
  await app.register(plugin, options);

  return app;
};
export default build;
