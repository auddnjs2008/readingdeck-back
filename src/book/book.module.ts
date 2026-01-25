import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { Book } from './entity/book.entity';
import { S3Service } from 'src/common/service/s3.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Book])],
  providers: [BookService, S3Service],
  controllers: [BookController],
})
export class BookModule {}
