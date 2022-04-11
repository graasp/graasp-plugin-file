import S3 from 'aws-sdk/clients/s3';
import contentDisposition from 'content-disposition';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

import { GraaspS3FileItemOptions } from '../types';
import FileService from './interface/fileService';
import { S3FileNotFound } from '../utils/errors';
import { StatusCodes } from 'http-status-codes';
import { DEFAULT_CACHE_CONTROL_MAX_AGE, S3_PRESIGNED_EXPIRATION } from '../utils/constants';

export class S3Service implements FileService {
  private readonly options: GraaspS3FileItemOptions;
  private readonly s3Instance: S3;
  private cacheControlMaxAge: number

  constructor(options: GraaspS3FileItemOptions, cacheControlMaxAge?) {
    this.options = options;

    const {
      s3Region: region,
      s3AccessKeyId: accessKeyId,
      s3SecretAccessKey: secretAccessKey,
      s3UseAccelerateEndpoint: useAccelerateEndpoint = false,

      s3Instance,
    } = options;

    this.cacheControlMaxAge = cacheControlMaxAge ?? DEFAULT_CACHE_CONTROL_MAX_AGE

    this.s3Instance =
      s3Instance ??
      new S3({
        region,
        useAccelerateEndpoint,
        credentials: { accessKeyId, secretAccessKey },
      });
  }

  async copyFile({
    newId,
    memberId,
    originalPath,
    newFilePath,
    filename,
    mimetype,
  }): Promise<string> {
    const { s3Bucket: bucket } = this.options;

    const params = {
      CopySource: `${bucket}/${originalPath}`,
      Bucket: bucket,
      Key: newFilePath,
      Metadata: {
        member: memberId,
        item: newId,
      },
      MetadataDirective: 'REPLACE',
      ContentDisposition: contentDisposition(filename),
      ContentType: mimetype,
      CacheControl: 'no-cache', // TODO: improve?
    };

    // TODO: the Cache-Control policy metadata is lost. try to set a global policy for the bucket in aws.
    await this.s3Instance.copyObject(params).promise();

    return newFilePath;
  }

  async deleteFile({ filepath }): Promise<void> {
    const { s3Bucket: bucket } = this.options;
    await this.s3Instance
      .deleteObject({
        Bucket: bucket,
        Key: filepath,
      })
      .promise();
  }

  // delete all content in a folder
  async deleteFolder({ folderPath }): Promise<void> {
    const { s3Bucket: bucket } = this.options;

    // get all objects in a key
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
    const { Contents } = await this.s3Instance
      .listObjectsV2({ Bucket: bucket, Prefix: folderPath })
      .promise();

    const filepaths = Contents.map(({ Key }) => Key);

    if (filepaths.length) {
      await this.s3Instance
        .deleteObjects({
          Bucket: bucket,
          Delete: {
            Objects: filepaths.map((filepath) => ({
              Key: filepath,
            })),
            Quiet: false,
          },
        })
        .promise();
    }
  }

  async downloadFile({ reply, filepath, itemId, fileStorage }) {
    const { s3Bucket: bucket } = this.options;
    try {
      // check whether file exists
      await this.getMetadata(filepath);

      const param = {
        Bucket: bucket,
        Key: filepath,
        Expires: S3_PRESIGNED_EXPIRATION,
      };

      const url = await this.s3Instance.getSignedUrlPromise('getObject', param);

      // Redirect to the object presigned url
      if (reply) {
        // It is necessary to add the header manually, because the redirect sends the request and
        // when the fastify-cors plugin try to add the header it's already sent and can't add it.
        // So we add it because otherwise the browser won't send the cookie
        reply.header('Access-Control-Allow-Credentials', 'true');
        reply.redirect(url);
      }
      // return readstream of the file saved at given fileStorage path
      else if (fileStorage) {
        // fetch and save file in temporary path
        const res = await fetch(url);
        const tmpPath = path.join(fileStorage, itemId);
        const fileStream = fs.createWriteStream(tmpPath);
        await new Promise((resolve, reject) => {
          res.body.pipe(fileStream);
          res.body.on('error', reject);
          fileStream.on('finish', resolve);
        });
        fileStream.end();

        // create and return read stream (similar to local file service)
        const file = fs.createReadStream(tmpPath);
        file.on('close', function (err) {
          if (err) {
            console.error(err);
          }
          fs.unlinkSync(tmpPath);
        });

        return file;
      } else {
        return url;
      }
    } catch (e) {
      if (e.statusCode === StatusCodes.NOT_FOUND) {
        throw new S3FileNotFound({ filepath, itemId });
      }
      throw e;
    }
  }

  // get file buffer, used for generating thumbnails
  // async getFileBuffer({ filepath }): Promise<Buffer> {
  //   const { s3Bucket: bucket } = this.options;
  //   const params = {
  //     Bucket: bucket,
  //     Key: filepath,
  //   };
  //   try {
  //     return (await this.s3Instance.getObject(params).promise()).Body as Buffer;
  //   } catch (e) {
  //     if (e.statusCode === StatusCodes.NOT_FOUND) {
  //       throw new S3FileNotFound({ filepath });
  //     }
  //     throw e;
  //   }
  // }

  async getMetadata(key: string) {
    const { s3Bucket: Bucket } = this.options;
    const metadata = await this.s3Instance
      .headObject({ Bucket, Key: key })
      .promise();
    return metadata;
  }

  async uploadFile({
    fileStream,
    memberId,
    filepath,
    mimetype,
  }): Promise<void> {
    const { s3Bucket: bucket } = this.options;

    const params = {
      Bucket: bucket,
      Key: filepath,
      Metadata: {
        member: memberId,
        // item: id <- cannot add item id
      },
      Body: fileStream,
      ContentType: mimetype,
      CacheControl: `max-age=${this.cacheControlMaxAge}`, // TODO: improve?
    };

    // TO CHANGE: use signed url ? but difficult to set up callback
    await this.s3Instance.putObject(params).promise();
  }
}
