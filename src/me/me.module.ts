import { Module } from '@nestjs/common';
import { MeService } from './me.service';
import { MeController } from './me.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from 'src/book/entity/book.entity';
import { User } from 'src/user/entity/user.entity';
import { Card } from 'src/card/entity/card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Book, User, Card])],
  providers: [MeService],
  controllers: [MeController],
})
export class MeModule {}
