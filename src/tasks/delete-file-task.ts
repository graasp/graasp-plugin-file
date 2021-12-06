import { Item, Actor, DatabaseTransactionHandler } from 'graasp';
import type { FastifyLoggerInstance } from 'fastify';
import { BaseTask } from './base-task';
import FileService from '../fileServices/interface/fileService';
import { DeleteFileInvalidPathError } from '../utils/errors';

export type DeleteFileInputType = {
  filepath?: string;
};

class DeleteFileTask extends BaseTask<Item | void> {
  get name(): string {
    return DeleteFileTask.name;
  }

  input: DeleteFileInputType;
  getInput: () => DeleteFileInputType;

  constructor(
    actor: Actor,
    instance: FileService,
    input?: DeleteFileInputType,
  ) {
    super(actor, instance);
    this.input = input || {};
  }

  async run(
    _handler: DatabaseTransactionHandler,
    log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = 'RUNNING';

    const { filepath } = this.input;

    if (!filepath) {
      throw new DeleteFileInvalidPathError(filepath);
    }

    await this.fileService.deleteFile({ filepath });

    this.status = 'OK';
  }
}

export default DeleteFileTask;
