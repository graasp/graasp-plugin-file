import { Item, Actor, DatabaseTransactionHandler } from 'graasp';
import type { FastifyLoggerInstance } from 'fastify';
import { BaseTask } from './base-task';
import FileService from '../fileServices/interface/fileService';
import { UploadFileInvalidParameterError } from '../utils/errors';

export type UploadFileInputType = {
  file: Buffer;
  filepath: string;
  mimetype: string;
};

class UploadFileTask extends BaseTask<Item | void> {
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

    const { file, mimetype, filepath } = this.input;

    if (!filepath) {
      throw new UploadFileInvalidParameterError({
        filepath,
        fileSize: file.byteLength,
      });
    }

    if (!file.byteLength) {
      throw new UploadFileInvalidParameterError({
        filepath,
        fileSize: file.byteLength,
      });
    }

    await this.fileService.uploadFile({
      fileBuffer: file,
      filepath,
      memberId: this.actor.id,
      mimetype,
    });

    this.status = 'OK';
  }
}

export default UploadFileTask;
