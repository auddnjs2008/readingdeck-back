import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import {
  type UploadAssetContext,
  UploadAssetType,
} from '../const/upload-path.const';
import { envVariableKeys } from '../const/env.const';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucket: string;
  private region: string;
  private assetBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.region = configService.get<string>(envVariableKeys.awsRegion);
    this.s3 = new S3Client({
      region: this.region,
    });
    this.bucket = configService.get<string>(envVariableKeys.bucketName);
    this.assetBaseUrl =
      configService
        .get<string>(envVariableKeys.assetBaseUrl)
        ?.replace(/\/+$/, '') ??
      `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
  }

  private getExtensionFromFilename(filename?: string | null) {
    const extension = filename?.split('.').pop()?.trim().toLowerCase();
    return extension ? extension.replace(/[^a-z0-9]/g, '') : null;
  }

  private getExtensionFromMimeType(mimeType?: string | null) {
    if (!mimeType) return null;

    const [type, subtype] = mimeType.toLowerCase().split('/');
    if (type !== 'image' || !subtype) return null;

    if (subtype === 'jpeg') return 'jpg';
    if (subtype.includes('svg')) return 'svg';
    if (subtype.includes('png')) return 'png';
    if (subtype.includes('webp')) return 'webp';
    if (subtype.includes('gif')) return 'gif';
    if (subtype.includes('avif')) return 'avif';

    return subtype.replace(/[^a-z0-9]/g, '');
  }

  private getExtensionFromUrl(url?: string | null) {
    if (!url) return null;

    const sanitizedUrl = url.split('?')[0].split('#')[0];
    return this.getExtensionFromFilename(sanitizedUrl);
  }

  private resolveAssetDirectory(context: UploadAssetContext) {
    switch (context.type) {
      case UploadAssetType.PROFILE_AVATAR:
        return `profiles/${context.userId ?? 'unknown'}/avatar`;
      case UploadAssetType.BOOK_COVER_UPLOAD:
        return `books/${context.userId ?? 'unknown'}/cover`;
      default:
        return 'uploads/misc';
    }
  }

  private buildAssetKey(
    context: UploadAssetContext,
    extension?: string | null,
  ) {
    const directory = this.resolveAssetDirectory(context);
    const safeExtension = extension ? `.${extension}` : '';
    return `${directory}/${uuid()}${safeExtension}`;
  }

  async uploadImage(file: Express.Multer.File, context: UploadAssetContext) {
    const extension =
      this.getExtensionFromFilename(file.originalname) ??
      this.getExtensionFromMimeType(file.mimetype) ??
      'jpg';
    const key = this.buildAssetKey(context, extension);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return key;
  }

  async uploadImageByUrl(url: string, context: UploadAssetContext) {
    const response$ = this.httpService.get(url, {
      responseType: 'arraybuffer',
    });
    const response = await lastValueFrom(response$);

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] ?? 'image/jpeg';
    const extension =
      this.getExtensionFromMimeType(contentType) ??
      this.getExtensionFromUrl(url) ??
      'jpg';
    const key = this.buildAssetKey(context, extension);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return key;
  }

  resolvePublicUrl(keyOrUrl?: string | null) {
    if (!keyOrUrl) {
      return null;
    }

    if (/^https?:\/\//i.test(keyOrUrl)) {
      return keyOrUrl;
    }

    return `${this.assetBaseUrl}/${keyOrUrl.replace(/^\/+/, '')}`;
  }
}
