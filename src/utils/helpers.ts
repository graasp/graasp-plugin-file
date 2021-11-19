import { createHash } from 'crypto';

export const hash = (id: string): string =>
  createHash('sha256').update(id).digest('hex');

export const createS3Key = (prefix: string, id: string, size: string): string =>
  prefix ? `${prefix}/${hash(id)}/${size}` : `${hash(id)}/${size}`;
export const createFsKey = (prefix: string, id: string, size: string): string =>
  prefix ? `${prefix}/${hash(id)}/${size}` : `${hash(id)}/${size}`;
export const createFsFolder = (
  root: string,
  prefix: string,
  id: string,
): string => (prefix ? `${root}/${prefix}/${hash(id)}` : `${root}/${hash(id)}`);

export const randomHexOf4 = () =>
  ((Math.random() * (1 << 16)) | 0).toString(16).padStart(4, '0');
