import { FastifyLoggerInstance } from 'fastify';

import {
  Actor,
  DatabaseTransactionHandler,
  FileService,
  TaskStatus,
} from '@graasp/sdk';

import { BaseTask } from './base-task';

export type CopyFolderType = {
  originalFolderPath: string;
  newFolderPath: string;
};

class CopyFolderTask extends BaseTask<Actor, string> {
  get name(): string {
    return CopyFolderTask.name;
  }

  input: CopyFolderType;
  getInput: () => CopyFolderType;

  constructor(actor: Actor, service: FileService, input: CopyFolderType) {
    super(actor, service);
    this.input = input;
  }

  async run(
    _handler: DatabaseTransactionHandler,
    _log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = TaskStatus.RUNNING;

    const { originalFolderPath, newFolderPath } = this.input;

    this._result = await this.fileService.copyFolder({
      originalFolderPath,
      newFolderPath,
    });

    this.status = TaskStatus.OK;
  }
}

export default CopyFolderTask;
