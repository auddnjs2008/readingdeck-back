import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from './entity/book.entity';
import { Repository } from 'typeorm';
import { CreateBookDto } from './dto/create-book.dto';
import { User } from 'src/user/entity/user.entity';
import { S3Service } from 'src/common/service/s3.service';
import { BookSortType, GetBookQueryDto } from './dto/get-book-query.dto';
import {
  CardSortType,
  GetBookCardsQueryDto,
} from './dto/get-bookcards-query.dto';
import { Card } from 'src/card/entity/card.entity';

@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    private readonly s3Service: S3Service,
  ) {}

  async getBooks(query: GetBookQueryDto) {
    const { page = 1, take = 10, keyword, sort } = query;
    const skip = (page - 1) * take;

    const qb = this.bookRepository.createQueryBuilder('book');

    if (keyword) {
      qb.andWhere('(book.title ILIKE :keyword OR book.author ILIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    if (sort) {
      switch (sort) {
        case BookSortType.CREATED_AT:
          qb.orderBy('book.createdAt', 'DESC');
          break;
        case BookSortType.RECENT_CARD:
          qb.leftJoin('book.cards', 'card')
            .addSelect('MAX(card.createdAt)', 'lastCardAt')
            .groupBy('book.id')
            .orderBy('lastCardAt', 'DESC');
          break;
        case BookSortType.MOST_CARDS:
          qb.leftJoin('book.cards', 'card')
            .addSelect('COUNT(card.id)', 'cardCount')
            .groupBy('book.id')
            .orderBy('cardCount', 'DESC');
          break;
        default:
          qb.orderBy('book.createdAt', 'DESC');
          break;
      }
    }

    qb.orderBy('book.createdAt', 'DESC').skip(skip).take(take);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getBook(bookId: number) {
    const book = await this.bookRepository.findOne({ where: { id: bookId } });

    if (!book) {
      throw new NotFoundException('해당 관련 책을 찾을 수 없습니다.');
    }

    return book;
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

  async createBook(
    createBookDto: CreateBookDto,
    userId: number,
    file?: Express.Multer.File,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('해당 유저가 없습니다');
    }

    const backgroundImage = file
      ? await this.s3Service.uploadImage(file)
      : null;

    const book = this.bookRepository.create({
      ...createBookDto,
      backgroundImage,
    });

    return this.bookRepository.save(book);
  }
}
