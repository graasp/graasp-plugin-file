import { Actor, Member, Task, UnknownExtra } from 'graasp';
import S3 from 'aws-sdk/clients/s3';

export enum ServiceMethod {
  S3,
  LOCAL,
}
export interface LocalFileItemExtra extends UnknownExtra {
  file: {
    name: string;
    path: string;
    mimetype: string;
    size: string;
  };
}

export interface S3FileItemExtra extends UnknownExtra {
  s3File: {
    name: string;
    path: string;
    mimetype: string;
    size: string;
  };
}

export type BuildFilePathFunction = (
  itemId: string,
  filename: string,
) => string;

export type AuthTokenSubject = {
  member: string;
  item: string;
  origin: string;
  app: string;
};

export type UploadPreHookTasksFunction = (
  parentId: string,
  auth: { member: Member; token: AuthTokenSubject },
) => Promise<Task<Actor, unknown>[]>;

export type UploadPostHookTasksFunction = (
  data: {
    file: Buffer;
    filename: string;
    mimetype: string;
    size: number;
    filepath: string;
    itemId: string;
  },
  auth: { member: Member; token: AuthTokenSubject },
) => Promise<Task<Actor, unknown>[]>;

export type DownloadPreHookTasksFunction = (
  item: { itemId: string; filename?: string },
  auth: { member: Member; token: AuthTokenSubject },
) => Promise<Task<Actor, unknown>[]>;

export type DownloadPostHookTasksFunction = (
  itemId: string,
  auth: { member: Member; token: AuthTokenSubject },
) => Promise<Task<Actor, unknown>[]>;

export interface GraaspS3FileItemOptions {
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3UseAccelerateEndpoint?: boolean;
  s3Expiration?: number;
  s3Instance?: S3;
}

export interface GraaspLocalFileItemOptions {
  /**
   * {string} root path for file paths. It should NOT end with a /
   */
  storageRootPath: string;
}
