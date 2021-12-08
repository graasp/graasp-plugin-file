import S3 from 'aws-sdk/clients/s3';
import contentDisposition from 'content-disposition';

import { GraaspS3FileItemOptions } from '../types';
import FileService from './interface/fileService';
import { S3FileNotFound } from '../utils/errors';
import { StatusCodes } from 'http-status-codes';

export class S3Service implements FileService {
  private readonly options: GraaspS3FileItemOptions;
  private readonly s3Instance: S3;

  constructor(options: GraaspS3FileItemOptions) {
    this.options = options;

    const {
      s3Region: region,
      s3AccessKeyId: accessKeyId,
      s3SecretAccessKey: secretAccessKey,
      s3UseAccelerateEndpoint: useAccelerateEndpoint = false,
      s3Instance,
    } = options;

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
      CopySource: originalPath,
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

  async downloadFile({ reply, filepath, itemId }) {
    const { s3Bucket: bucket, s3Region: region } = this.options;
    try {
      // check whether file exists
      await this.getMetadata(filepath);

      // Redirect to url, TODO: Change for something better
      reply.header('Access-Control-Allow-Credentials', 'true');
      reply.redirect(
        `https://${bucket}.s3.${region}.amazonaws.com/${filepath}`,
      );
    } catch (e) {
      if (e.statusCode === StatusCodes.NOT_FOUND) {
        throw new S3FileNotFound({ filepath, itemId });
      }
      throw e;
    }
  }

  // get file buffer, used for generating thumbnails
  async getFileBuffer({ filepath }): Promise<Buffer> {
    const { s3Bucket: bucket } = this.options;
    const params = {
      Bucket: bucket,
      Key: filepath,
    };
    try {
      return (await this.s3Instance.getObject(params).promise()).Body as Buffer;
    } catch (e) {
      if (e.statusCode === StatusCodes.NOT_FOUND) {
        throw new S3FileNotFound({ filepath });
      }
      throw e;
    }
  }

  async getMetadata(key: string) {
    const { s3Bucket: Bucket } = this.options;
    const metadata = await this.s3Instance
      .headObject({ Bucket, Key: key })
      .promise();
    return metadata;
  }

  async uploadFile({
    fileBuffer,
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
      Body: fileBuffer,
      ContentType: mimetype,
      CacheControl: 'no-cache', // TODO: improve?
    };

    // TO CHANGE: use signed url ? but difficult to set up callback
    await this.s3Instance.putObject(params).promise();
  }
}
