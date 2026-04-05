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
import { S3Service } from 'src/common/service/s3.service';
import { BookStatus } from 'src/book/entity/book.entity';
import { CardEmbeddingService } from 'src/card-embedding/card-embedding.service';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    private readonly s3Service: S3Service,
    private readonly cardEmbeddingService: CardEmbeddingService,
  ) {}

  private mapCardBookImage<
    T extends { book?: { backgroundImage?: string | null } | null },
  >(card: T): T {
    if (!card.book) {
      return card;
    }

    return {
      ...card,
      book: {
        ...card.book,
        backgroundImage: this.s3Service.resolvePublicUrl(
          card.book.backgroundImage,
        ),
      },
    };
  }

  async getTodayCards(userId: number, query: GetTodayCardsQueryDto) {
    const { limit = 3 } = query;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const items = await this.cardRepository
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

    return items.map((card) => this.mapCardBookImage(card));
  }

  async getCardDetail(userId: number, cardId: number) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
      relations: { book: { user: true } },
    });

    if (!card) {
      throw new NotFoundException('해당 카드를 찾을 수 없습니다.');
    }

    if (card.book.user.id !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return this.mapCardBookImage({
      id: card.id,
      type: card.type,
      quote: card.quote,
      thought: card.thought,
      backgroundImage: card.backgroundImage,
      pageStart: card.pageStart,
      pageEnd: card.pageEnd,
      revisitCount: card.revisitCount,
      lastRevisitedAt: card.lastRevisitedAt,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      book: {
        id: card.book.id,
        title: card.book.title,
        author: card.book.author,
        publisher: card.book.publisher,
        backgroundImage: card.book.backgroundImage,
      },
    });
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

    const thought = createCardDto.thought.trim();
    const quote = createCardDto.quote?.trim() || undefined;

    if (!thought) {
      throw new BadRequestException('thought는 비어 있을 수 없습니다.');
    }

    if (
      createCardDto.pageStart !== null &&
      createCardDto.pageStart !== undefined &&
      createCardDto.pageEnd !== null &&
      createCardDto.pageEnd !== undefined &&
      createCardDto.pageStart > createCardDto.pageEnd
    ) {
      throw new BadRequestException('pageStart는 pageEnd보다 클 수 없습니다.');
    }

    const card = this.cardRepository.create({
      ...createCardDto,
      thought,
      quote,
      book: { id: bookId },
    });

    const savedCard = await this.cardRepository.save(card);
    try {
      await this.cardEmbeddingService.upsertForCard(savedCard.id);
    } catch (error) {
      console.error('Card embedding sync failed', {
        cardId: savedCard.id,
        error,
      });
    }

    if (book.status === BookStatus.PAUSED) {
      book.status = BookStatus.READING;
      if (!book.startedAt) {
        book.startedAt = new Date();
      }
      await this.bookRepository.save(book);
    }

    return savedCard;
  }

  async updateCard(
    userId: number,
    cardId: number,
    updateCardDto: UpdateCardDto,
  ) {
    const card = await this.findOwnedCard(userId, cardId);

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

    const updatedCard = await this.cardRepository.save(card);
    try {
      await this.cardEmbeddingService.upsertForCard(updatedCard.id);
    } catch (error) {
      console.error('Card embedding sync failed', {
        cardId: updatedCard.id,
        error,
      });
    }
    return updatedCard;
  }

  async revisitCard(userId: number, cardId: number) {
    const card = await this.findOwnedCard(userId, cardId);

    card.lastRevisitedAt = new Date();
    card.revisitCount = (card.revisitCount ?? 0) + 1;

    return this.cardRepository.save(card);
  }

  async deleteCard(userId: number, cardId: number) {
    const card = await this.findOwnedCard(userId, cardId);

    await this.cardRepository.delete({ id: card.id });
    try {
      await this.cardEmbeddingService.removeForCard(card.id);
    } catch (error) {
      console.error('Card embedding delete failed', {
        cardId: card.id,
        error,
      });
    }
  }

  private async findOwnedCard(userId: number, cardId: number) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
      relations: { book: { user: true } },
    });

    if (!card) {
      throw new NotFoundException('해당 카드를 찾을 수 없습니다.');
    }

    if (card.book.user.id !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return card;
  }
}
