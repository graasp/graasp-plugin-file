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
import { FILE_METHODS, BuildFilePathFunction } from './types';
import { LocalService } from './fileServices/localService';
import { S3Service } from './fileServices/s3Service';

class TaskManager {
  private service: LocalService | S3Service;

  constructor(
    options,
    serviceMethod: FILE_METHODS,
    buildFilePath: BuildFilePathFunction,
  ) {
    let service;
    switch (serviceMethod) {
      case FILE_METHODS.S3:
        service = new S3Service(options.s3, buildFilePath);
        break;
      case FILE_METHODS.LOCAL:
      default:
        service = new LocalService(options.local, buildFilePath);
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
    return new UploadFileTask(member, this.service, data);
  }

  createDownloadFileTask(
    member: Actor,
    data: DownloadFileInputType,
    size?: string,
  ): Task<Actor, unknown> {
    return new DownloadFileTask(member, this.service, data);
  }

  createDeleteFileTask(
    member: Actor,
    data: DeleteFileInputType,
  ): Task<Actor, unknown> {
    return new DeleteFileTask(member, this.service, data);
  }

  createDeleteFolderTask(
    member: Actor,
    data: DeleteFolderInputType,
  ): Task<Actor, unknown> {
    return new DeleteFolderTask(member, this.service, data);
  }

  createCopyFileTask(member: Actor, data: CopyInputType): Task<Actor, unknown> {
    // new filename is new item id
    return new CopyFileTask(member, this.service, data);
  }

  createGetFileBufferTask(
    member: Actor,
    data: GetFileBufferInputType,
  ): Task<Actor, unknown> {
    // new filename is new item id
    return new GetFileBufferTask(member, this.service, data);
  }
}

export default TaskManager;
