import { Item, Actor, DatabaseTransactionHandler } from 'graasp';
import type { FastifyLoggerInstance } from 'fastify';
import { BaseTask } from './base-task';
import FileService from '../fileServices/interface/fileService';

export type GetFileBufferInputType = {
  filename?: string;
};

class GetFileBufferTask extends BaseTask<Buffer> {
  get name(): string {
    return GetFileBufferTask.name;
  }

  input: GetFileBufferInputType;
  getInput: () => GetFileBufferInputType;

  constructor(
    actor: Actor,
    instance: FileService,
    input?: GetFileBufferInputType,
  ) {
    super(actor, instance);
    this.input = input || {};
  }

  async run(
    _handler: DatabaseTransactionHandler,
    log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = 'RUNNING';

    const { filename } = this.input;

    try {
      this._result = await this.fileService.getFileBuffer({ filepath: filename });
    } catch (error) {
      log.error(error);
    }

    this.status = 'OK';
  }
}

export default GetFileBufferTask;
