import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { S3Service } from './service/s3.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [S3Service],
  exports: [S3Service],
})
export class CommonModule {}
