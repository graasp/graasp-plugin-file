import { Item, Actor, DatabaseTransactionHandler } from 'graasp';
import type { FastifyLoggerInstance } from 'fastify';
import { BaseTask } from './base-task';
import FileService from '../fileServices/interface/fileService';
import { UploadFileInvalidParameterError } from '../utils/errors';
import { Readable } from 'stream';

export type UploadFileInputType = {
  file: Readable;
  filepath: string;
  mimetype: string;
  size?: number
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

    const { file, mimetype, filepath } = this.input;

    if (!filepath) {
      throw new UploadFileInvalidParameterError({
        filepath,
        // fileSize: file.byteLength,
      });
    }

    // if (!file.byteLength) {
    //   throw new UploadFileInvalidParameterError({
    //     filepath,
    //     // fileSize: file.byteLength,
    //   });
    // }

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
