import {
  Actor,
  Member,
  Task,
  UnknownExtra,
} from 'graasp';

export enum FILE_METHODS {
  S3,
  LOCAL,
}
export interface FileItemExtra extends UnknownExtra {
  file: {
    name: string;
    path: string;
    mimetype: string;
  };
}

export interface S3FileItemExtra extends UnknownExtra {
  s3File: {
    name: string;
    path: string;
    size?: number;
    contenttype?: string;
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
  item: {itemId: string, filename?: string},
  auth: { member: Member; token: AuthTokenSubject },
) => Promise<Task<Actor, unknown>[]>;

export type DownloadPostHookTasksFunction = (
  itemId: string,
  auth: { member: Member; token: AuthTokenSubject },
) => Promise<Task<Actor, unknown>[]>;
