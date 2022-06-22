import type { FastifyLoggerInstance } from 'fastify';

import { Actor, DatabaseTransactionHandler } from 'graasp';

import FileService from '../fileServices/interface/fileService';
import { CopyFileInvalidPathError } from '../utils/errors';
import { BaseTask } from './base-task';

export type CopyInputType = {
  newId?: string;
  newFilePath?: string;
  originalPath?: string;
  mimetype?: string;
};

class CopyFileTask extends BaseTask<Actor, string> {
  get name(): string {
    return CopyFileTask.name;
  }

  input: CopyInputType;
  getInput: () => CopyInputType;

  constructor(actor: Actor, service: FileService, input?: CopyInputType) {
    super(actor, service);
    this.input = input ?? {};
  }

  async run(
    _handler: DatabaseTransactionHandler,
    _log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = 'RUNNING';

    const { originalPath, newFilePath, newId, mimetype } = this.input;

    if (!originalPath) {
      throw new CopyFileInvalidPathError(originalPath);
    }
    if (!newFilePath) {
      throw new CopyFileInvalidPathError(newFilePath);
    }

    this._result = await this.fileService.copyFile({
      newId,
      memberId: this.actor.id,
      originalPath,
      newFilePath,
      mimetype,
    });

    this.status = 'OK';
  }
}

export default CopyFileTask;
