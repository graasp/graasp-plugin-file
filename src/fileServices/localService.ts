import { copyFile, mkdir, rm, stat } from 'fs/promises';
import { GraaspFileItemOptions } from 'graasp-plugin-file-item';
import fs from 'fs';
import path from 'path';
import FileService from './interface/fileService';
import { readFile, access } from 'fs/promises';
import contentDisposition from 'content-disposition';
import { mimetype } from '../utils/constants';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { BuildFilePathFunction } from '../types';

import util from 'util';
import stream from 'stream';
import { FastifyReply } from 'fastify';
const pipeline = util.promisify(stream.pipeline);

export class LocalService implements FileService {
  private readonly options: GraaspFileItemOptions;
  private readonly buildFilePath: BuildFilePathFunction;

  constructor(
    options: GraaspFileItemOptions,
    buildFilePath: BuildFilePathFunction,
  ) {
    this.options = options;
    this.buildFilePath = buildFilePath;
  }

  // get file buffer, used for generating thumbnails
  async getFileBuffer({ filepath }): Promise<Buffer> {
    return await readFile(filepath);
  }

  async downloadFileUrl({ reply, filepath, itemId }) {
    // ensure the file exists, if not throw error
    try {
      await access(filepath);
    } catch (e) {
      if (e.code === 'ENOENT') {
        return reply
          .status(StatusCodes.NOT_FOUND)
          .send(ReasonPhrases.NOT_FOUND);
      }
      throw e;
    }

    // Get thumbnail path
    reply.type(mimetype);
    // this header will make the browser download the file with 'name'
    // instead of simply opening it and showing it
    reply.header('Content-Disposition', contentDisposition(itemId));
    return fs.createReadStream(filepath);
  }

  // copy
  async copyFile({ newId, originalPath, newFilePath }): Promise<string> {
    // create directories path ???
    await mkdir(newFilePath, { recursive: true });

    await copyFile(originalPath, newFilePath);

    return newFilePath;
  }

  // delete
  async deleteFile({ filepath }): Promise<void> {
    await rm(filepath);
  }
  // delete
  async deleteFolder({ folderPath }): Promise<void> {
    await rm(folderPath, {recursive:true});
  }

  // upload
  async uploadFile({ fileBuffer, filepath }): Promise<void> {
    const folderPath = path.dirname(filepath);
    // create folder
    await mkdir(folderPath, {
      recursive: true,
    });

    // create file at path
    await pipeline(fileBuffer, fs.createWriteStream(filepath));
  }
}
