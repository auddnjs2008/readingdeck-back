import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UploadAssetType } from 'src/common/const/upload-path.const';
import { Book } from './entity/book.entity';
import { In, Repository } from 'typeorm';
import { CreateBookDto } from './dto/create-book.dto';
import { User } from 'src/user/entity/user.entity';
import { S3Service } from 'src/common/service/s3.service';
import { BookSortType, GetBookQueryDto } from './dto/get-book-query.dto';
import { SearchBookQueryDto } from './dto/search-book-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';

import { Card } from 'src/card/entity/card.entity';
import { KakaoBookService } from 'src/integrations/kakao/kakao-book.service';
import { BookStatus } from './entity/book.entity';

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

  private mapBookImage<T extends { backgroundImage?: string | null }>(
    book: T,
  ): T {
    return {
      ...book,
      backgroundImage: this.s3Service.resolvePublicUrl(book.backgroundImage),
    };
  }

  private calculateProgressPercent(
    currentPage?: number | null,
    totalPages?: number | null,
  ) {
    if (!currentPage || !totalPages || totalPages <= 0) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, Math.round((currentPage / totalPages) * 100)),
    );
  }

  private mapBookResponse<
    T extends {
      backgroundImage?: string | null;
      currentPage?: number | null;
      totalPages?: number | null;
    },
  >(book: T): T & { progressPercent: number } {
    const mapped = this.mapBookImage(book);
    return {
      ...mapped,
      progressPercent: this.calculateProgressPercent(
        mapped.currentPage,
        mapped.totalPages,
      ),
    };
  }

  async getBooks(userId: number, query: GetBookQueryDto) {
    const { page = 1, take = 10, keyword, sort, status } = query;
    const skip = (page - 1) * take;

    const applyKeyword = (qb) => {
      if (status) {
        qb.andWhere('book.status = :status', { status });
      }
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
          .andWhere('EXISTS (SELECT 1 FROM card c WHERE c."bookId" = book.id)')
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
        items: items.map((book) => this.mapBookResponse(book)),
        meta: { total, page, take, totalPages: Math.ceil(total / take) },
      };
    }

    const qb = this.bookRepository
      .createQueryBuilder('book')
      .loadRelationCountAndMap('book.cardCount', 'book.cards');
    qb.andWhere('book.userId = :userId', { userId });
    applyKeyword(qb);
    qb.orderBy(
      sort === BookSortType.UPDATED_AT ? 'book.updatedAt' : 'book.createdAt',
      'DESC',
    )
      .skip(skip)
      .take(take);
    const items = await qb.getMany();
    const total = await qb.clone().orderBy().getCount();

    return {
      items: items.map((book) => this.mapBookResponse(book)),
      meta: { total, page, take, totalPages: Math.ceil(total / take) },
    };
  }

  async getBook(userId: number, bookId: number) {
    const book = await this.findOwnedBook(userId, bookId);
    return this.mapBookResponse(book);
  }

  async deleteBook(userId: number, bookId: number) {
    const book = await this.findOwnedBook(userId, bookId);
    const cardCount = await this.cardRepository.count({
      where: { book: { id: book.id } },
    });

    if (cardCount > 0) {
      throw new ConflictException(
        '연결된 카드가 있는 책은 삭제할 수 없습니다.',
      );
    }

    await this.bookRepository.delete({ id: book.id });
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
      backgroundImage = await this.s3Service.uploadImage(file, {
        type: UploadAssetType.BOOK_COVER_UPLOAD,
        userId,
      });
    } else if (createBookDto.imageUrl) {
      // External search covers stay as source URLs for now to avoid
      // duplicating the same public image into S3 on every book creation.
      backgroundImage = createBookDto.imageUrl;
    }

    const book = this.bookRepository.create({
      title: createBookDto.title,
      author: createBookDto.author,
      publisher: createBookDto.publisher,
      contents: createBookDto.contents,
      backgroundImage,
      status: createBookDto.status ?? BookStatus.PAUSED,
      currentPage: createBookDto.currentPage ?? null,
      totalPages: createBookDto.totalPages ?? null,
      startedAt: createBookDto.startedAt
        ? new Date(createBookDto.startedAt)
        : createBookDto.status === BookStatus.READING ||
            (createBookDto.currentPage ?? 0) > 0
          ? new Date()
          : null,
      finishedAt: createBookDto.finishedAt
        ? new Date(createBookDto.finishedAt)
        : createBookDto.status === BookStatus.FINISHED
          ? new Date()
          : null,
      user,
    });

    const savedBook = await this.bookRepository.save(book);
    return this.mapBookResponse(savedBook);
  }

  async updateBook(
    userId: number,
    bookId: number,
    updateBookDto: UpdateBookDto,
  ) {
    const book = await this.findOwnedBook(userId, bookId);

    if (updateBookDto.status !== undefined) {
      book.status = updateBookDto.status;
    }

    if (updateBookDto.totalPages !== undefined) {
      book.totalPages = updateBookDto.totalPages;
    }

    if (updateBookDto.currentPage !== undefined) {
      book.currentPage = updateBookDto.currentPage;
    }

    if (
      book.currentPage != null &&
      book.totalPages != null &&
      book.currentPage > book.totalPages
    ) {
      book.currentPage = book.totalPages;
    }

    if (book.status === BookStatus.FINISHED && book.totalPages != null) {
      book.currentPage = book.totalPages;
    }

    if (updateBookDto.startedAt !== undefined) {
      book.startedAt = updateBookDto.startedAt
        ? new Date(updateBookDto.startedAt)
        : null;
    } else if (
      (book.status === BookStatus.READING || (book.currentPage ?? 0) > 0) &&
      !book.startedAt
    ) {
      book.startedAt = new Date();
    }

    if (updateBookDto.finishedAt !== undefined) {
      book.finishedAt = updateBookDto.finishedAt
        ? new Date(updateBookDto.finishedAt)
        : null;
    } else if (book.status === BookStatus.FINISHED && !book.finishedAt) {
      book.finishedAt = new Date();
    } else if (book.status !== BookStatus.FINISHED) {
      book.finishedAt = null;
    }

    const savedBook = await this.bookRepository.save(book);
    return this.mapBookResponse(savedBook);
  }

  private async findOwnedBook(userId: number, bookId: number) {
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

    return book;
  }
}
