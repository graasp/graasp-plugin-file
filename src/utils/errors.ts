import { GraaspErrorDetails, GraaspError } from 'graasp';
import { StatusCodes } from 'http-status-codes';
import { FAILURE_MESSAGES } from '@graasp/translations';

export class GraaspBaseError implements GraaspError {
  name: string;
  code: string;
  message: string;
  statusCode?: number;
  data?: unknown;
  origin: 'plugin' | string;

  constructor(
    { code, statusCode, message }: GraaspErrorDetails,
    data?: unknown,
  ) {
    this.name = code;
    this.code = code;
    this.message = message;
    this.statusCode = statusCode;
    this.data = data;
    this.origin = 'plugin';
  }
}

export class UploadFileInvalidParameterError extends GraaspBaseError {
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
export class CopyFileInvalidPathError extends GraaspBaseError {
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
export class DeleteFileInvalidPathError extends GraaspBaseError {
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
export class DeleteFolderInvalidPathError extends GraaspBaseError {
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
export class DownloadFileInvalidParameterError extends GraaspBaseError {
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

export class LocalFileNotFound extends GraaspBaseError {
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

export class S3FileNotFound extends GraaspBaseError {
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
