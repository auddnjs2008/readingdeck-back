import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from './entity/book.entity';
import { In, Repository } from 'typeorm';
import { CreateBookDto } from './dto/create-book.dto';
import { User } from 'src/user/entity/user.entity';
import { S3Service } from 'src/common/service/s3.service';
import { BookSortType, GetBookQueryDto } from './dto/get-book-query.dto';
import { SearchBookQueryDto } from './dto/search-book-query.dto';
import {
  CardSortType,
  GetBookCardsQueryDto,
} from './dto/get-bookcards-query.dto';
import { Card } from 'src/card/entity/card.entity';
import { KakaoBookService } from 'src/integrations/kakao/kakao-book.service';

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
    private readonly kakaoBookService: KakaoBookService,
  ) {}

  async getBooks(userId: number, query: GetBookQueryDto) {
    const { page = 1, take = 10, keyword, sort } = query;
    const skip = (page - 1) * take;

    const applyKeyword = (qb) => {
      if (keyword) {
        qb.andWhere(
          '(book.title ILIKE :keyword OR book.author ILIKE :keyword)',
          { keyword: `%${keyword}%` },
        );
      }
    };

    if (sort === BookSortType.RECENT_CARD || sort === BookSortType.MOST_CARDS) {
      const orderQb = this.bookRepository.createQueryBuilder('book');
      orderQb.andWhere('book.userId = :userId', { userId });
      applyKeyword(orderQb);

      if (sort === BookSortType.RECENT_CARD) {
        orderQb
          .select('book.id', 'id')
          .orderBy(
            '(SELECT MAX(c."createdAt") FROM card c WHERE c."bookId" = book.id)',
            'DESC',
          );
      } else {
        orderQb
          .select('book.id', 'id')
          .orderBy(
            '(SELECT COUNT(*) FROM card c WHERE c."bookId" = book.id)',
            'DESC',
          );
      }

      const totalRaw = await orderQb
        .clone()
        .select('COUNT(DISTINCT book.id)', 'total')
        .orderBy()
        .getRawOne();

      const total = Number(totalRaw.total);

      const idRows = await orderQb.clone().skip(skip).take(take).getRawMany();
      const ids = idRows.map((row) => Number(row.id));

      if (ids.length === 0) {
        return {
          items: [],
          meta: { total, page, take, totalPages: Math.ceil(total / take) },
        };
      }

      const books = await this.bookRepository.findBy({ id: In(ids) });
      const map = new Map(books.map((b) => [b.id, b]));
      const items = ids
        .map((id) => map.get(id))
        .filter((b): b is Book => Boolean(b));

      const countRows = await this.cardRepository
        .createQueryBuilder('card')
        .select('card.bookId', 'bookId')
        .addSelect('COUNT(card.id)', 'count')
        .where('card.bookId IN (:...ids)', { ids })
        .groupBy('card.bookId')
        .getRawMany();
      const countMap = new Map(
        countRows.map((r) => [Number(r.bookId), Number(r.count)]),
      );
      items.forEach((book) => {
        (book as Book & { cardCount: number }).cardCount =
          countMap.get(book.id) ?? 0;
      });

      return {
        items,
        meta: { total, page, take, totalPages: Math.ceil(total / take) },
      };
    }

    const qb = this.bookRepository
      .createQueryBuilder('book')
      .loadRelationCountAndMap('book.cardCount', 'book.cards');
    qb.andWhere('book.userId = :userId', { userId });
    applyKeyword(qb);
    qb.orderBy('book.createdAt', 'DESC').skip(skip).take(take);
    const items = await qb.getMany();
    const total = await qb.clone().orderBy().getCount();

    return {
      items,
      meta: { total, page, take, totalPages: Math.ceil(total / take) },
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

  async searchBooks(query: SearchBookQueryDto) {
    return this.kakaoBookService.searchBooks(query);
  }

  async createBook(
    createBookDto: CreateBookDto,
    userId: number,
    file?: Express.Multer.File,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    let backgroundImage: string | null = null;
    if (!user) {
      throw new NotFoundException('해당 유저가 없습니다');
    }

    if (file) {
      backgroundImage = await this.s3Service.uploadImage(file);
    } else if (createBookDto.imageUrl) {
      backgroundImage = await this.s3Service.uploadImageByUrl(
        createBookDto.imageUrl,
      );
    }

    const book = this.bookRepository.create({
      title: createBookDto.title,
      author: createBookDto.author,
      publisher: createBookDto.publisher,
      contents: createBookDto.contents,
      backgroundImage,
      user,
    });

    return this.bookRepository.save(book);
  }
}
