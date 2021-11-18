import { Item, Actor, DatabaseTransactionHandler } from 'graasp';
import contentDisposition from 'content-disposition';
import fs from 'fs';
import type { FastifyLoggerInstance, FastifyReply } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { BaseTask } from './base-task';
import FileService from '../fileServices/interface/fileService';

export type DownloadFileInputType = {
  reply?: FastifyReply;
  filepath?: string;
  itemId?: string;
};

class DownloadFileTask extends BaseTask<fs.ReadStream> {
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

  /**
   *
   * thumbnail
   * prehook:
   * - check has access to file
   * s3
   * prehook:
   * - check has access to file
   *
   * ----> public should have access without testing item permissions
   * ---->>>> ENFORCE task to return item ?
   *
   *
   *
   * default prehook: (id, member) => {
   * return itemTaskManager.createGetItemTaskSequence(id, member)
   * }
   * public prehook: (id, member) => {
   * // no check over permissions
   * return itemTaskManager.createGetItemTask(id, member)
   * }
   */

  async run(
    handler: DatabaseTransactionHandler,
    log: FastifyLoggerInstance,
  ): Promise<void> {
    this.status = 'RUNNING';

    const { reply, itemId, filepath } = this.input;

    // last task should return item
    this._result =
      (await this.fileService.downloadFileUrl({
        reply,
        filepath,
        itemId,
      })) || null;

    this.status = 'OK';
  }
}

export default DownloadFileTask;
