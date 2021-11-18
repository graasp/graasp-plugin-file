import { Item, Actor, DatabaseTransactionHandler } from 'graasp';
import type { FastifyLoggerInstance } from 'fastify';
import { BaseTask } from './base-task';
import FileService from '../fileServices/interface/fileService';

export type CopyInputType = {
  newId: string;
  // item: Item
  filename: string;
  newFilePath: string;
  originalPath: string;
};

class CopyFileTask extends BaseTask<string> {
  get name(): string {
    return CopyFileTask.name;
  }

  input: CopyInputType;
  getInput: () => CopyInputType;

  constructor(actor: Actor, service: FileService, input?: CopyInputType) {
    super(actor, service);
    this.input = input;
  }

  async run(
    _handler: DatabaseTransactionHandler,
    log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = 'RUNNING';

    const { originalPath, newFilePath, newId, filename } = this.input;

    try {
      this._result = await this.fileService.copyFile({
        newId,
        memberId: this.actor.id,
        originalPath,
        newFilePath,
      });
    } catch (error) {
      log.error(error);
    }

    this.status = 'OK';
  }
}

export default CopyFileTask;
