import { Actor, DatabaseTransactionHandler } from 'graasp';
import type { FastifyLoggerInstance } from 'fastify';
import { BaseTask } from './base-task';
import FileService from '../fileServices/interface/fileService';
import { GetFileBufferInvalidParameterError } from '../utils/errors';

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

    if (!filename) {
      throw new GetFileBufferInvalidParameterError({ filename });
    }

    this._result = await this.fileService.getFileBuffer({
      filepath: filename,
    });

    this.status = 'OK';
  }
}

export default GetFileBufferTask;
