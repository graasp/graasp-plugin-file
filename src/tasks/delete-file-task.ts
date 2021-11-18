import { Item, Actor, DatabaseTransactionHandler } from 'graasp';
import contentDisposition from 'content-disposition';
import fs from 'fs';
import type { FastifyLoggerInstance, FastifyReply } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { BaseTask } from './base-task';
import FileService from '../fileServices/interface/fileService';

export type DeleteFileInputType = {
  itemId?: string;
  filename?: string;
};

class DeleteFileTask extends BaseTask<Item | void> {
  get name(): string {
    return DeleteFileTask.name;
  }

  input: DeleteFileInputType;
  getInput: () => DeleteFileInputType;

  constructor(actor: Actor, instance: FileService, input?: DeleteFileInputType) {
    super(actor, instance);
    this.input = input || {};
  }

  async run(
    handler: DatabaseTransactionHandler,
    log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = 'RUNNING';

    const { itemId, filename } = this.input;

    try {
      await this.fileService.deleteFile({ filepath: filename });
    } catch (error) {
      log.error(error);
    }

    this.status = 'OK';
  }
}

export default DeleteFileTask;
