import contentDisposition from 'content-disposition';
import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import { access, copyFile, mkdir, rm } from 'fs/promises';
import { pipeline } from 'stream/promises';

import { GraaspLocalFileItemOptions } from '../types';
import FileService from './interface/fileService';
import { LocalFileNotFound } from '../utils/errors';

export class LocalService implements FileService {
  private readonly options: GraaspLocalFileItemOptions;

  constructor(options: GraaspLocalFileItemOptions) {
    this.options = options;
  }

  buildFullPath = (filepath: string) =>
    path.join(this.options.storageRootPath, filepath);

  // copy
  async copyFile({ originalPath, newFilePath }) {
    const originalFullPath = this.buildFullPath(originalPath);
    const newFileFullPath = this.buildFullPath(newFilePath);

    await mkdir(path.dirname(newFileFullPath), { recursive: true });

    await copyFile(originalFullPath, newFileFullPath);

    return newFilePath;
  }

  async copyFolder({ originalFolderPath, newFolderPath }): Promise<string> {
    const originalFullPath = this.buildFullPath(originalFolderPath);
    const newFullPath = this.buildFullPath(newFolderPath);

    await mkdir(path.dirname(newFullPath), { recursive: true });

    // use fs-extra for recursive folder copy
    await fse.copy(originalFullPath, newFullPath);

    return newFolderPath;
  }

  // delete
  async deleteFile({ filepath }): Promise<void> {
    await rm(this.buildFullPath(filepath));
  }
  // delete
  async deleteFolder({ folderPath }): Promise<void> {
    await rm(this.buildFullPath(folderPath), { recursive: true });
  }

  async downloadFile({ reply, filepath, itemId, mimetype }) {
    // ensure the file exists, if not throw error
    try {
      await access(this.buildFullPath(filepath));
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new LocalFileNotFound({ itemId, filepath });
      }
      throw e;
    }

    if (reply) {
      // Get thumbnail path
      reply.type(mimetype);
      // this header will make the browser download the file with 'name'
      // instead of simply opening it and showing it
      reply.header('Content-Disposition', contentDisposition(itemId));
    }
    return fs.createReadStream(this.buildFullPath(filepath));
  }

  // upload
  async uploadFile({ fileStream, filepath }): Promise<void> {
    const folderPath = path.dirname(this.buildFullPath(filepath));
    // create folder
    await mkdir(folderPath, {
      recursive: true,
    });

    // create file at path
    await pipeline(
      fileStream,
      fs.createWriteStream(this.buildFullPath(filepath)),
    );
  }
}
