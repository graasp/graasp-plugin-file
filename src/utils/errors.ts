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

export class ThumbnailNotFound extends GraaspBaseError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GPTERR001',
        statusCode: StatusCodes.NOT_FOUND,
        message: 'Thumbnail not found',
      },
      data,
    );
  }
}

export class FileNotFound extends GraaspBaseError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GPFERR001',
        statusCode: StatusCodes.NOT_FOUND,
        message: 'File not found',
      },
      data,
    );
  }
}

export class S3FileNotFound extends GraaspBaseError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GPFERR001',
        statusCode: StatusCodes.NOT_FOUND,
        message: 'File not found',
      },
      data,
    );
  }
}
