import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetTodayCardsQueryDto } from './dto/get-today-cards-query.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from './entity/card.entity';
import { Repository } from 'typeorm';
import { CreateCardDto } from './dto/create-card.dto';
import { User } from 'src/user/entity/user.entity';
import { Book } from 'src/book/entity/book.entity';
import {
  CardSortType,
  GetBookCardsQueryDto,
} from './dto/get-bookcards-query.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
  ) {}
  async getTodayCards(userId: number, query: GetTodayCardsQueryDto) {
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

  async getBookCards(
    userId: number,
    bookId: number,
    query: GetBookCardsQueryDto,
  ) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: { user: true },
    });

    if (!book) {
      throw new NotFoundException('해당 관련 책을 찾을 수 없습니다.');
    }

    if (book.user.id !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const {
      take = 10,
      cursor,
      types,
      hasQuote,
      sort = CardSortType.LATEST,
      pageEnd,
      pageStart,
    } = query;

    const cardQb = this.cardRepository
      .createQueryBuilder('card')
      .where('card.bookId = :bookId', { bookId });

    // 타입 필터

    if (types && types.length > 0) {
      cardQb.andWhere('card.type IN (:...types)', { types });
    }

    if (hasQuote === true) {
      cardQb.andWhere('card.quote IS NOT NULL');
    }

    if (hasQuote === false) {
      cardQb.andWhere('card.quote IS NULL');
    }
    if (pageStart) {
      cardQb.andWhere(
        '(card.pageEnd >= :pageStart OR (card.pageEnd IS NULL AND card.pageStart >= :pageStart) )',
        { pageStart },
      );
    }
    if (pageEnd) {
      cardQb.andWhere(
        '(card.pageStart <= :pageEnd OR (card.pageStart IS NULL AND card.pageEnd <= :pageEnd))',
        { pageEnd },
      );
    }

    if (sort === CardSortType.OLDEST) {
      cardQb.orderBy('card.id', 'ASC');
      if (cursor) cardQb.andWhere('card.id > :cursor', { cursor });
    } else {
      cardQb.orderBy('card.id', 'DESC');
      if (cursor) cardQb.andWhere('card.id < :cursor', { cursor });
    }

    cardQb.take(take + 1);

    const items = await cardQb.getMany();
    console.log(items, 'items');

    const hasNext = items.length > take;
    const trimmedItems = hasNext ? items.slice(0, take) : items;
    const nextCursor =
      trimmedItems.length > 0 ? trimmedItems[trimmedItems.length - 1].id : null;

    return {
      items: trimmedItems,
      nextCursor,
      hasNext,
    };
  }

  async createCard(
    userId: number,
    bookId: number,
    createCardDto: CreateCardDto,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('해당 유저가 없습니다');
    }

    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['user'],
    });

    if (!book) {
      throw new NotFoundException('해당 책이 없습니다.');
    }

    if (book.user.id !== userId) {
      throw new ForbiddenException('이 책에 카드를 추가할 권한이 없습니다.');
    }

    const card = this.cardRepository.create({
      ...createCardDto,
      book: { id: bookId },
    });

    return this.cardRepository.save(card);
  }

  async updateCard(
    userId: number,
    cardId: number,
    updateCardDto: UpdateCardDto,
  ) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
      relations: { book: { user: true } },
    });

    if (!card) {
      throw new NotFoundException('해당 카드를 찾을 수 없습니다.');
    }

    if (card.book.user.id !== userId) {
      throw new ForbiddenException('이 카드를 수정할 권한이 없습니다.');
    }

    const nextPageStart =
      updateCardDto.pageStart !== undefined
        ? updateCardDto.pageStart
        : card.pageStart;
    const nextPageEnd =
      updateCardDto.pageEnd !== undefined
        ? updateCardDto.pageEnd
        : card.pageEnd;

    if (
      nextPageStart !== null &&
      nextPageStart !== undefined &&
      nextPageEnd !== null &&
      nextPageEnd !== undefined &&
      nextPageStart > nextPageEnd
    ) {
      throw new BadRequestException('pageStart는 pageEnd보다 클 수 없습니다.');
    }

    if (updateCardDto.type !== undefined) {
      card.type = updateCardDto.type;
    }
    if (updateCardDto.quote !== undefined) {
      card.quote = updateCardDto.quote;
    }
    if (updateCardDto.thought !== undefined) {
      card.thought = updateCardDto.thought;
    }
    if (updateCardDto.pageStart !== undefined) {
      card.pageStart = updateCardDto.pageStart;
    }
    if (updateCardDto.pageEnd !== undefined) {
      card.pageEnd = updateCardDto.pageEnd;
    }

    return this.cardRepository.save(card);
  }
}
