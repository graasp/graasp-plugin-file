import { Actor, DatabaseTransactionHandler } from 'graasp';
import { ReadStream } from 'fs';
import type { FastifyLoggerInstance, FastifyReply } from 'fastify';
import { BaseTask } from './base-task';
import FileService from '../fileServices/interface/fileService';
import { DownloadFileInvalidParameterError } from '../utils/errors';

export type DownloadFileInputType = {
  reply?: FastifyReply;
  filepath?: string;
  itemId?: string;
  mimetype?: string;
  fileStorage?: string;
};

class DownloadFileTask extends BaseTask<ReadStream | string> {
  get name(): string {
    return DownloadFileTask.name;
  }

  input: DownloadFileInputType;
  getInput: () => DownloadFileInputType;

  constructor(
    actor: Actor,
    fileService: FileService,
    input?: DownloadFileInputType,
  ) {
    super(actor, fileService);
    this.input = input || {};
  }

  async run(
    _handler: DatabaseTransactionHandler,
    _log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = 'RUNNING';

    const { reply, itemId, filepath, mimetype, fileStorage } = this.input;

    if (!filepath || !itemId) {
      throw new DownloadFileInvalidParameterError({
        itemId,
        filepath,
        mimetype,
      });
    }

    // last task should return item
    // s3 returns null and redirect
    this._result =
      (await this.fileService.downloadFile({
        reply,
        filepath,
        itemId,
        mimetype,
        fileStorage,
      })) || null;

    this.status = 'OK';
  }
}

export default DownloadFileTask;
