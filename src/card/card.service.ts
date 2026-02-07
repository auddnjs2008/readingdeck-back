import { Injectable } from '@nestjs/common';
import { GetTodayCardsQueryDto } from './dto/get-today-cards-query.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from './entity/card.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
  ) {}
  async getTodayCards(userId: string, query: GetTodayCardsQueryDto) {
    const { limit = 3 } = query;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.cardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.book', 'book')
      .where('book.userId = :userId', { userId })
      .andWhere('card.createdAt BETWEEN :startOfDay AND :endOfDay', {
        startOfDay,
        endOfDay,
      })
      .orderBy('card.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }
}
