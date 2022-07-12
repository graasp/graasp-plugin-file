import { StatusCodes } from 'http-status-codes';

import { BaseGraaspError } from '@graasp/sdk';
import { FAILURE_MESSAGES } from '@graasp/translations';

import { PLUGIN_NAME } from './constants';

export class UploadFileInvalidParameterError extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super(
      {
        code: 'GPFERR001',
        statusCode: StatusCodes.BAD_REQUEST,
        message: FAILURE_MESSAGES.INVALID_UPLOAD_PARAMETERS,
      },
      data,
    );
  }
}
export class CopyFileInvalidPathError extends BaseGraaspError {
  origin = PLUGIN_NAME;

  constructor(filepath?: unknown) {
    super(
      {
        code: 'GPFERR002',
        statusCode: StatusCodes.BAD_REQUEST,
        message: FAILURE_MESSAGES.INVALID_FILE_PATH_FOR_COPY,
      },
      filepath,
    );
  }
}
export class DeleteFileInvalidPathError extends BaseGraaspError {
  origin = PLUGIN_NAME;

  constructor(filepath?: unknown) {
    super(
      {
        code: 'GPFERR003',
        statusCode: StatusCodes.BAD_REQUEST,
        message: FAILURE_MESSAGES.INVALID_FILE_PATH_FOR_DELETE,
      },
      filepath,
    );
  }
}
export class DeleteFolderInvalidPathError extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(folderPath?: unknown) {
    super(
      {
        code: 'GPFERR004',
        statusCode: StatusCodes.BAD_REQUEST,
        message: FAILURE_MESSAGES.INVALID_FOLDER_PATH_FOR_DELETE,
      },
      folderPath,
    );
  }
}
export class DownloadFileInvalidParameterError extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super(
      {
        code: 'GPFERR005',
        statusCode: StatusCodes.BAD_REQUEST,
        message: FAILURE_MESSAGES.INVALID_DOWNLOAD_PARAMETERS,
      },
      data,
    );
  }
}

export class LocalFileNotFound extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super(
      {
        code: 'GPFERR006',
        statusCode: StatusCodes.NOT_FOUND,
        message: FAILURE_MESSAGES.LOCAL_FILE_NOT_FOUND,
      },
      data,
    );
  }
}

export class S3FileNotFound extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super(
      {
        code: 'GPFERR007',
        statusCode: StatusCodes.NOT_FOUND,
        message: FAILURE_MESSAGES.S3_FILE_NOT_FOUND,
      },
      data,
    );
  }
}

export class UploadEmptyFileError extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super(
      {
        code: 'GPFERR008',
        statusCode: StatusCodes.BAD_REQUEST,
        message: FAILURE_MESSAGES.UPLOAD_EMPTY_FILE,
      },
      data,
    );
  }
}
