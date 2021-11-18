import { Item, Actor, DatabaseTransactionHandler } from 'graasp';
import type { FastifyLoggerInstance } from 'fastify';
import { BaseTask } from './base-task';
import FileService from '../fileServices/interface/fileService';

export type UploadFileInputType = {
  itemId: string;
  file: Buffer;
  filename: string;
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
    handler: DatabaseTransactionHandler,
    log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = 'RUNNING';

    const { file, itemId, filename } = this.input;

    await this.fileService.uploadFile({
      fileBuffer: file,
      filepath: filename,
      memberId: this.actor.id,
    });

    this.status = 'OK';
  }
}

export default UploadFileTask;
