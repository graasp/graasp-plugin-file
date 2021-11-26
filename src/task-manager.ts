import { Task, Actor } from 'graasp';
import CopyFileTask, { CopyInputType } from './tasks/copy-file-task';
import DeleteFileTask, { DeleteFileInputType } from './tasks/delete-file-task';
import DownloadFileTask, {
  DownloadFileInputType,
} from './tasks/download-file-task';
import GetFileBufferTask, {
  GetFileBufferInputType,
} from './tasks/get-file-buffer-task';
import DeleteFolderTask, {
  DeleteFolderInputType,
} from './tasks/delete-folder-task';
import UploadFileTask, { UploadFileInputType } from './tasks/upload-file-task';
import { ServiceMethod } from './types';
import { LocalService } from './fileServices/localService';
import { S3Service } from './fileServices/s3Service';
import { GraaspLocalFileItemOptions, GraaspS3FileItemOptions } from './types';

class TaskManager {
  private readonly fileService: LocalService | S3Service;

  constructor(
    options: { s3: GraaspS3FileItemOptions; local: GraaspLocalFileItemOptions },
    serviceMethod: ServiceMethod,
  ) {
    switch (serviceMethod) {
      case ServiceMethod.S3:
        this.fileService = new S3Service(options.s3);
        break;
      case ServiceMethod.LOCAL:
      default:
        this.fileService = new LocalService(options.local);
        break;
    }
  }

  getUploadFileTaskName(): string {
    return UploadFileTask.name;
  }
  getDownloadFileTaskName(): string {
    return DownloadFileTask.name;
  }

  createUploadFileTask(
    member: Actor,
    data: UploadFileInputType,
  ): Task<Actor, unknown> {
    return new UploadFileTask(member, this.fileService, data);
  }

  createDownloadFileTask(
    member: Actor,
    data: DownloadFileInputType,
  ): Task<Actor, unknown> {
    return new DownloadFileTask(member, this.fileService, data);
  }

  createDeleteFileTask(
    member: Actor,
    data: DeleteFileInputType,
  ): Task<Actor, unknown> {
    return new DeleteFileTask(member, this.fileService, data);
  }

  createDeleteFolderTask(
    member: Actor,
    data: DeleteFolderInputType,
  ): Task<Actor, unknown> {
    return new DeleteFolderTask(member, this.fileService, data);
  }

  createCopyFileTask(member: Actor, data: CopyInputType): Task<Actor, unknown> {
    // new filename is new item id
    return new CopyFileTask(member, this.fileService, data);
  }

  createGetFileBufferTask(
    member: Actor,
    data: GetFileBufferInputType,
  ): Task<Actor, unknown> {
    // new filename is new item id
    return new GetFileBufferTask(member, this.fileService, data);
  }
}

export default TaskManager;
