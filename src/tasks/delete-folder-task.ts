import type { FastifyLoggerInstance } from 'fastify';

import {
  Actor,
  DatabaseTransactionHandler,
  Item,
  TaskStatus,
} from '@graasp/sdk';

import { DeleteFolderInvalidPathError } from '../utils/errors';
import { BaseTask } from './base-task';

export type DeleteFolderInputType = {
  folderPath?: string;
};

class DeleteFolderTask extends BaseTask<Actor, Item> {
  get name(): string {
    return DeleteFolderTask.name;
  }

  input: DeleteFolderInputType;
  getInput: () => DeleteFolderInputType;

  constructor(actor: Actor, instance, input?: DeleteFolderInputType) {
    super(actor, instance);
    this.input = input || {};
  }

  async run(
    _handler: DatabaseTransactionHandler,
    _log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = TaskStatus.RUNNING;

    const { folderPath } = this.input;

    if (!folderPath) {
      throw new DeleteFolderInvalidPathError(folderPath);
    }

    await this.fileService.deleteFolder({ folderPath });

    this.status = TaskStatus.OK;
  }
}

export default DeleteFolderTask;
