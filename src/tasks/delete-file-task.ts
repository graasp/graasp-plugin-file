import type { FastifyLoggerInstance } from 'fastify';

import { Actor, DatabaseTransactionHandler, Item } from 'graasp';

import FileService from '../fileServices/interface/fileService';
import { DeleteFileInvalidPathError } from '../utils/errors';
import { BaseTask } from './base-task';

export type DeleteFileInputType = {
  filepath?: string;
};

class DeleteFileTask extends BaseTask<Actor, Item> {
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
    _log: FastifyLoggerInstance,
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
