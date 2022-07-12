import { ReadStream } from 'fs';

import type { FastifyLoggerInstance, FastifyReply } from 'fastify';

import {
  Actor,
  DatabaseTransactionHandler,
  FileService,
  TaskStatus,
} from '@graasp/sdk';

import { DownloadFileInvalidParameterError } from '../utils/errors';
import { BaseTask } from './base-task';

export type DownloadFileInputType = {
  reply?: FastifyReply;
  filepath?: string;
  itemId?: string;
  mimetype?: string;
  fileStorage?: string;
  expiration?: number;
};

class DownloadFileTask extends BaseTask<Actor, ReadStream | string> {
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
    this.status = TaskStatus.RUNNING;

    const { reply, itemId, filepath, mimetype, fileStorage, expiration } =
      this.input;

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
        expiration,
      })) || null;

    this.status = TaskStatus.OK;
  }
}

export default DownloadFileTask;
