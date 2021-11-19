import { Item, Actor, DatabaseTransactionHandler } from 'graasp';
import type { FastifyLoggerInstance } from 'fastify';
import { BaseTask } from './base-task';

export type DeleteFolderInputType = {
  folderPath?: string;
};

class DeleteFolderTask extends BaseTask<Item | void> {
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
    log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = 'RUNNING';

    const { folderPath } = this.input;

    try {
      await this.fileService.deleteFolder({ folderPath });
    } catch (error) {
      log.error(error);
    }

    this.status = 'OK';
  }
}

export default DeleteFolderTask;
