import { access, copyFile, mkdir, readFile, rm } from 'fs/promises';
import { GraaspFileItemOptions } from 'graasp-plugin-file-item';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import FileService from './interface/fileService';
import contentDisposition from 'content-disposition';
import { mimetype } from '../utils/constants';
import { FileNotFound } from '../utils/errors';

export class LocalService implements FileService {
  private readonly options: GraaspFileItemOptions;

  constructor(options: GraaspFileItemOptions) {
    this.options = options;
  }

  buildFullPath = (filepath) => `${this.options.storageRootPath}/${filepath}`;

  // get file buffer, used for generating thumbnails
  async getFileBuffer({ filepath }): Promise<Buffer> {
    return await readFile(this.buildFullPath(filepath));
  }

  async downloadFile({ reply, filepath, itemId }) {
    // ensure the file exists, if not throw error
    try {
      await access(this.buildFullPath(filepath));
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new FileNotFound({ itemId, filepath });
      }
      throw e;
    }

    // Get thumbnail path
    reply.type(mimetype);
    // this header will make the browser download the file with 'name'
    // instead of simply opening it and showing it
    reply.header('Content-Disposition', contentDisposition(itemId));
    return fs.createReadStream(this.buildFullPath(filepath));
  }

  // copy
  async copyFile({ originalPath, newFilePath }) {
    const originalFullPath = this.buildFullPath(originalPath);
    const newFileFullPath = this.buildFullPath(newFilePath);

    await mkdir(newFileFullPath, { recursive: true });

    await copyFile(originalFullPath, newFileFullPath);

    return newFilePath;
  }

  // delete
  async deleteFile({ filepath }): Promise<void> {
    await rm(this.buildFullPath(filepath));
  }
  // delete
  async deleteFolder({ folderPath }): Promise<void> {
    await rm(this.buildFullPath(folderPath), { recursive: true });
  }

  // upload
  async uploadFile({ fileBuffer, filepath }): Promise<void> {
    const folderPath = path.dirname(this.buildFullPath(filepath));
    // create folder
    await mkdir(folderPath, {
      recursive: true,
    });

    // create file at path
    await pipeline(
      Readable.from(fileBuffer),
      fs.createWriteStream(this.buildFullPath(filepath)),
    );
  }
}
