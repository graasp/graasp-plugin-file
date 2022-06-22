import { ReadStream } from 'fs';

import type { FastifyLoggerInstance } from 'fastify';

import { Actor, DatabaseTransactionHandler, Item } from 'graasp';

import FileService from '../fileServices/interface/fileService';
import {
  UploadEmptyFileError,
  UploadFileInvalidParameterError,
} from '../utils/errors';
import { BaseTask } from './base-task';

export type UploadFileInputType = {
  file?: ReadStream;
  filepath?: string;
  mimetype?: string;
  size?: number;
};

class UploadFileTask extends BaseTask<Actor, Item> {
  get name(): string {
    return UploadFileTask.name;
  }

  input: UploadFileInputType;
  getInput: () => UploadFileInputType;

  constructor(
    actor: Actor,
    fileService: FileService,
    input?: UploadFileInputType,
  ) {
    super(actor, fileService);
    this.input = input || {};
  }

  async run(
    _handler: DatabaseTransactionHandler,
    _log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = 'RUNNING';

    const { file, mimetype, filepath, size } = this.input;

    if (!file || !filepath) {
      throw new UploadFileInvalidParameterError({
        file,
        filepath,
        size,
      });
    }

    if (!size) {
      throw new UploadEmptyFileError({
        file,
        filepath,
        size,
      });
    }

    await this.fileService.uploadFile({
      fileStream: file,
      filepath,
      memberId: this.actor.id,
      mimetype,
    });

    this.status = 'OK';
  }
}

export default UploadFileTask;
