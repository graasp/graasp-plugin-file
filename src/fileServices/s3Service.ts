import S3 from 'aws-sdk/clients/s3';
import contentDisposition from 'content-disposition';
import { GraaspS3FileItemOptions } from 'graasp-plugin-s3-file-item';
import FileService from './interface/fileService';
import { S3FileNotFound } from '../utils/errors';

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

  async getMetadata(key: string) {
    const { s3Bucket: Bucket } = this.options;
    const metadata = await this.s3Instance
      .headObject({ Bucket, Key: key })
      .promise();
    return metadata;
  }

  // get file buffer, used for generating thumbnails
  async getFileBuffer({ filepath }): Promise<Buffer> {
    const { s3Bucket: bucket } = this.options;
    const params = {
      Bucket: bucket,
      Key: filepath,
    };
    return (await this.s3Instance.getObject(params).promise()).Body as Buffer;
  }

  async downloadFile({ reply, filepath, itemId }) {
    const { s3Bucket: bucket, s3Region: region } = this.options;
    try {
      // check whether file exists
      await this.getMetadata(filepath);

      // Redirect to url, TODO: Change for something better
      reply.redirect(
        `https://${bucket}.s3.${region}.amazonaws.com/${filepath}`,
      );
    } catch (e) {
      // TODO: check error and return the corresponding one
      throw new S3FileNotFound({ filepath, itemId });
    }
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

  async deleteFolder({ folderPath }): Promise<void> {
    const { s3Bucket: bucket } = this.options;

    // get all objects in a key
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
    const { Contents } = await this.s3Instance
      .listObjectsV2({ Bucket: bucket, Prefix: folderPath })
      .promise();

    const filepaths = Contents.map(({ Key }) => Key);

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

  // upload
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

  /** UPLOAD FILE USING A SIGNED URL
     * This is difficult to use, as we lose the trigger on upload 
     * 
     * const name = filename.substring(0, ORIGINAL_FILENAME_TRUNCATE_LIMIT);
            const key = `${randomHexOf4()}/${randomHexOf4()}/${randomHexOf4()}-${Date.now()}`;

            const itemData: Partial<Item<S3FileItemExtra>> = {
                name,
                type: S3_ITEM_TYPE,
                extra: { s3File: { name: filename, key } },
            };
            // create item
            const task = taskManager.createCreateTaskSequence(member, itemData, parentId);
            const item = (await runner.runSingleSequence(task, log)) as Item;

            // add member and item info to S3 object metadata
            const metadata = { member: member.id, item: item.id };

            const params = {
                Bucket: bucket,
                Key: key,
                Expires: expiration,
                Metadata: metadata,
                // currently does not work. more info here: https://github.com/aws/aws-sdk-js/issues/1703
                // the workaround is to do the upload (PUT) from the client with this request header.
                // ContentDisposition: `attachment; filename="<filename>"`
                // also does not work. should the client always send it when uploading the file?
                // CacheControl: 'no-cache'
            };

            // request s3 signed url to upload file
            try {
                const uploadUrl = await s3.getSignedUrlPromise('uploadFile', params);
                return { item, uploadUrl };
            } catch (error) {
                log.error(error, 'graasp-s3-file-item: failed to get signed url for upload');
                throw error;
            }

                // metadata
    fastify.get<{ Params: IdParam }> (
    '/:id/s3-metadata',
    { schema: getMetadataSchema },
    async ({ member, params: { id }, log }) => {
      const t1 = taskManager.createGetTaskSequence(member, id);
      const t2 = S3FileItemTaskManager.createGetMetadataFromItemTask(member);
      t2.getInput = () => ({ item: t1[0].result });
      return runner.runSingleSequence([...t1, t2], log);
    },
  );
     */
}
