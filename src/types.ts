import { ReadStream } from 'fs';

import { Actor, AuthTokenSubject, Member, Task } from '@graasp/sdk';

export type BuildFilePathFunction = (
  itemId: string,
  filename: string,
) => string;

export type UploadPreHookTasksFunction = (
  data: {
    parentId: string;
    mimetype: string;
    size: number;
  },
  auth: { member: Member; token: AuthTokenSubject },
  fileBody?: any,
) => Promise<Task<Actor, unknown>[]>;

export type UploadPostHookTasksFunction = (
  data: {
    file: ReadStream;
    filename: string;
    mimetype: string;
    filepath: string;
    itemId: string;
    size: number;
  },
  auth: { member: Member; token: AuthTokenSubject },
  fileBody?: any,
) => Promise<Task<Actor, unknown>[]>;

export type DownloadPreHookTasksFunction = (
  item: { itemId: string; filename?: string },
  auth: { member: Member; token: AuthTokenSubject },
) => Promise<Task<Actor, unknown>[]>;

export type DownloadPostHookTasksFunction = (
  itemId: string,
  auth: { member: Member; token: AuthTokenSubject },
) => Promise<Task<Actor, unknown>[]>;
