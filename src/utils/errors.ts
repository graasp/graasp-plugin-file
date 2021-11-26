import { GraaspErrorDetails, GraaspError } from 'graasp';
import { StatusCodes } from 'http-status-codes';

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
        message: 'Upload parameters are invalid',
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
        message: `Path '${filepath}' is invalid`,
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
        message: `Path '${filepath}' is invalid`,
      },
      filepath,
    );
  }
}
export class DeleteFolderInvalidPathError extends GraaspBaseError {
  constructor(filepath?: unknown) {
    super(
      {
        code: 'GPFERR004',
        statusCode: StatusCodes.BAD_REQUEST,
        message: `Path '${filepath}' is invalid`,
      },
      filepath,
    );
  }
}
export class DownloadFileInvalidParameterError extends GraaspBaseError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GPFERR005',
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Download parameters are invalid',
      },
      data,
    );
  }
}

export class LocalFileNotFound extends GraaspBaseError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GPFERR005',
        statusCode: StatusCodes.NOT_FOUND,
        message: 'Local file not found',
      },
      data,
    );
  }
}

export class S3FileNotFound extends GraaspBaseError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GPFERR006',
        statusCode: StatusCodes.NOT_FOUND,
        message: 'S3 file not found',
      },
      data,
    );
  }
}

export class GetFileBufferInvalidParameterError extends GraaspBaseError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GPFERR001',
        statusCode: StatusCodes.BAD_REQUEST,
        message: `Get file buffer parameters are invalid`,
      },
      data,
    );
  }
}
