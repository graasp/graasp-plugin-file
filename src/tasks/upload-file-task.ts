import { Item, Actor, DatabaseTransactionHandler } from 'graasp';
import type { FastifyLoggerInstance } from 'fastify';
import { ReadStream } from 'fs';
import { BaseTask } from './base-task';
import FileService from '../fileServices/interface/fileService';
import { UploadFileInvalidParameterError } from '../utils/errors';

export type UploadFileInputType = {
  file: ReadStream;
  filepath: string;
  mimetype: string;
  size: number;
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
    this.input = input;
  }

  async run(
    _handler: DatabaseTransactionHandler,
    _log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = 'RUNNING';

    const { file, mimetype, filepath, size } = this.input;

    if (!filepath) {
      throw new UploadFileInvalidParameterError({
        filepath,
        size,
      });
    }

    if (!size) {
      throw new UploadFileInvalidParameterError({
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
