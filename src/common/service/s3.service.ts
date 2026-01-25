import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { envVariableKeys } from '../const/env.const';

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
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
}
