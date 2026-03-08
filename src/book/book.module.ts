import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { Book } from './entity/book.entity';
import { Card } from 'src/card/entity/card.entity';
import { KakaoModule } from 'src/integrations/kakao/kakao.module';
import { CardService } from 'src/card/card.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Book, Card]), KakaoModule],
  providers: [BookService, CardService],
  controllers: [BookController],
})
export class BookModule {}
