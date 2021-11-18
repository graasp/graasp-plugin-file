import { FastifyReply } from 'fastify';
import { ReadStream } from 'fs';
export default interface FileService {
  copyFile(args: {
    newId: string;
    memberId: string;
    originalPath: string;
    newFilePath: string;
  }): Promise<string>;

  deleteFile(args: { filepath: string }): Promise<void>;
  deleteFolder(args: { folderPath: string }): Promise<void>;

  uploadFile(args: {
    fileBuffer: Buffer;
    memberId: string;
    filepath: string;
  }): Promise<void>;

  // get file buffer, used for generating thumbnails
  getFileBuffer(args: { filepath: string }): Promise<Buffer>;

  downloadFileUrl(args: {
    reply: FastifyReply;
    filepath: string;
    itemId: string;
  }): Promise<ReadStream> | Promise<void>;
}
