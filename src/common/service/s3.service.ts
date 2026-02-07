import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { envVariableKeys } from '../const/env.const';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucket: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: configService.get<string>(envVariableKeys.awsRegion),
    });
    this.bucket = configService.get<string>(envVariableKeys.bucketName);
  }

  async uploadImage(file: Express.Multer.File) {
    const key = `books/${uuid()}-${file.originalname}}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://${this.bucket}.s3.${this.configService.get<string>(envVariableKeys.awsRegion)}.amazonaws.com/${key}`;
  }

  async uploadImageByUrl(url: string) {
    const response$ = this.httpService.get(url, {
      responseType: 'arraybuffer',
    });
    const response = await lastValueFrom(response$);

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] ?? 'image/jpeg';

    const key = `books/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.jpg`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return `https://${this.bucket}.s3.${this.configService.get<string>(envVariableKeys.awsRegion)}.amazonaws.com/${key}`;
  }
}
