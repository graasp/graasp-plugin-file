export const SMALL = 'small';
export const MEDIUM = 'medium';
export const LARGE = 'large';
export const ORIGINAL = 'original';

export const THUMBNAIL_SIZES = [SMALL, MEDIUM, LARGE, ORIGINAL];

export const S3_PRESIGNED_EXPIRATION = 600; // default 60s
export const MAX_NUMBER_OF_FILES_UPLOAD = 20;
export const MAX_NB_TASKS_IN_PARALLEL = 5;

export const PLUGIN_NAME = 'graasp-plugin-file';

export const DEFAULT_MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

export const SERVICE_TYPES = {
    LOCAL: 'localService',
    S3: 's3Service',
  };