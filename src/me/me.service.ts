import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Book, BookStatus } from 'src/book/entity/book.entity';
import { Card } from 'src/card/entity/card.entity';
import { S3Service } from 'src/common/service/s3.service';
import { DeckNode } from 'src/deck-node/entity/deck-node.entity';
import { User } from 'src/user/entity/user.entity';
import { Between, In, Repository } from 'typeorm';

@Injectable()
export class MeService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(DeckNode)
    private readonly deckNodeRepository: Repository<DeckNode>,
    private readonly s3Service: S3Service,
  ) {}

  private mapBookImage<T extends { backgroundImage?: string | null }>(
    book: T,
  ): T {
    return {
      ...book,
      backgroundImage: this.s3Service.resolvePublicUrl(book.backgroundImage),
    };
  }

  private mapCardBookImage<
    T extends { book?: { backgroundImage?: string | null } | null },
  >(card: T): T {
    if (!card.book) {
      return card;
    }

    return {
      ...card,
      book: this.mapBookImage(card.book),
    };
  }

  private getDiffInDays(baseDate: Date, targetDate: Date) {
    const diffMs = baseDate.getTime() - targetDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private getRevisitReason(card: Card) {
    const now = new Date();
    const createdDaysAgo = this.getDiffInDays(now, card.createdAt);
    const revisitedDaysAgo =
      card.lastRevisitedAt != null
        ? this.getDiffInDays(now, card.lastRevisitedAt)
        : null;

    if (card.lastRevisitedAt == null && createdDaysAgo <= 3) {
      return {
        reason: 'recently_created',
        reasonLabel: '최근 기록한 생각, 한 번 더 정리해보세요',
      };
    }

    if (card.lastRevisitedAt == null) {
      return {
        reason: 'never_revisited',
        reasonLabel: '아직 다시 보지 않은 카드',
      };
    }

    if (revisitedDaysAgo != null && revisitedDaysAgo >= 14) {
      return {
        reason: 'stale_revisit',
        reasonLabel: '오랫동안 다시 보지 않은 카드',
      };
    }

    return {
      reason: 'ready_to_revisit',
      reasonLabel: '다시 꺼내볼 타이밍의 카드',
    };
  }

  private mapRevisitCard(card: Card & { book?: Book | null }) {
    return {
      ...this.mapCardBookImage(card),
      ...this.getRevisitReason(card),
    };
  }

  private calculateProgressPercent(
    currentPage?: number | null,
    totalPages?: number | null,
  ) {
    if (
      currentPage == null ||
      totalPages == null ||
      totalPages <= 0 ||
      currentPage <= 0
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, Math.round((currentPage / totalPages) * 100)),
    );
  }

  private mapBookSummary(
    book: Book & { cardCount?: number },
  ): Book & { cardCount: number; progressPercent: number } {
    const mappedBook = this.mapBookImage(book);

    return {
      ...mappedBook,
      cardCount: book.cardCount ?? 0,
      progressPercent: this.calculateProgressPercent(
        book.currentPage,
        book.totalPages,
      ),
    };
  }

  private createUndeckedCardSubquery(userId: number) {
    return this.deckNodeRepository
      .createQueryBuilder('deckNode')
      .innerJoin('deckNode.deck', 'deck')
      .select('1')
      .where('deckNode.cardId = card.id')
      .andWhere('deck.userId = :userId', { userId });
  }

  async getMyProfile(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('해당 유저가 존재하지 않습니다.');
    }
    return {
      name: user.name,
      email: user.email,
      profile: user.profile,
      id: user.id,
    };
  }

  async getLibraryStats(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('해당 유저가 존재하지 않습니다.');
    }

    const bookQb = await this.bookRepository.createQueryBuilder('book');

    const result = await bookQb
      .leftJoin('book.cards', 'card')
      .select('COUNT(DISTINCT  book.id)', 'bookCount')
      .addSelect('COUNT(card.id)', 'cardCount')
      .where('book.userId = :userId', { userId })
      .getRawOne();

    return {
      bookCount: Number(result.bookCount),
      cardCount: Number(result.cardCount),
    };
  }

  async getDailyCardStack(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('해당 유저가 존재하지 않습니다.');
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const latestCards = await this.cardRepository.find({
      where: {
        book: { user: { id: userId } },
        createdAt: Between(start, end),
      },
      relations: { book: true },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return { items: latestCards.map((card) => this.mapCardBookImage(card)) };
  }

  async getRevisitCardStack(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('해당 유저가 존재하지 않습니다.');
    }

    const cards = await this.cardRepository.find({
      where: {
        book: { user: { id: userId } },
      },
      relations: { book: true },
      order: {
        lastRevisitedAt: 'ASC',
        createdAt: 'ASC',
      },
      take: 30,
    });

    const prioritized = cards.sort((a, b) => {
      const aNeverRevisited = a.lastRevisitedAt == null ? 0 : 1;
      const bNeverRevisited = b.lastRevisitedAt == null ? 0 : 1;

      if (aNeverRevisited !== bNeverRevisited) {
        return aNeverRevisited - bNeverRevisited;
      }

      const aTime = a.lastRevisitedAt?.getTime() ?? 0;
      const bTime = b.lastRevisitedAt?.getTime() ?? 0;
      if (aTime !== bTime) {
        return aTime - bTime;
      }

      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return {
      items: prioritized.slice(0, 6).map((card) => this.mapRevisitCard(card)),
    };
  }

  async getHomeSummary(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('해당 유저가 존재하지 않습니다.');
    }

    const revisitCardStack = await this.getRevisitCardStack(userId);

    const currentReadingBooks = await this.bookRepository
      .createQueryBuilder('book')
      .loadRelationCountAndMap('book.cardCount', 'book.cards')
      .where('book.userId = :userId', { userId })
      .andWhere('book.status = :status', { status: BookStatus.READING })
      .orderBy('book.updatedAt', 'DESC')
      .take(4)
      .getMany();

    const rawRecentRecordedBookIds = await this.cardRepository
      .createQueryBuilder('card')
      .innerJoin('card.book', 'book')
      .select('card.bookId', 'bookId')
      .addSelect('MAX(card.createdAt)', 'lastCardAt')
      .where('book.userId = :userId', { userId })
      .groupBy('card.bookId')
      .orderBy('MAX(card.createdAt)', 'DESC')
      .take(4)
      .getRawMany();

    const recentRecordedBookIds = rawRecentRecordedBookIds.map((row) =>
      Number(row.bookId),
    );

    const recentRecordedBooks =
      recentRecordedBookIds.length > 0
        ? await this.bookRepository
            .createQueryBuilder('book')
            .loadRelationCountAndMap('book.cardCount', 'book.cards')
            .where('book.id IN (:...ids)', { ids: recentRecordedBookIds })
            .getMany()
        : [];

    const recentRecordedBookMap = new Map(
      recentRecordedBooks.map((book) => [book.id, book]),
    );

    const undeckedCardSubquery = this.createUndeckedCardSubquery(userId);

    const rawDeckSuggestionRows = await this.cardRepository
      .createQueryBuilder('card')
      .innerJoin('card.book', 'book')
      .select('card.bookId', 'bookId')
      .addSelect('COUNT(card.id)', 'candidateCardCount')
      .addSelect('MAX(card.createdAt)', 'lastCardAt')
      .where('book.userId = :userId', { userId })
      .andWhere(`NOT EXISTS (${undeckedCardSubquery.getQuery()})`)
      .setParameters(undeckedCardSubquery.getParameters())
      .groupBy('card.bookId')
      .having('COUNT(card.id) >= 3')
      .orderBy('COUNT(card.id)', 'DESC')
      .addOrderBy('MAX(card.createdAt)', 'DESC')
      .take(3)
      .getRawMany();

    const suggestionBookIds = rawDeckSuggestionRows.map((row) =>
      Number(row.bookId),
    );

    const suggestionBooks =
      suggestionBookIds.length > 0
        ? await this.bookRepository.findBy({ id: In(suggestionBookIds) })
        : [];
    const suggestionBookMap = new Map(
      suggestionBooks.map((book) => [book.id, book]),
    );

    const candidateCards =
      suggestionBookIds.length > 0
        ? await this.cardRepository
            .createQueryBuilder('card')
            .leftJoinAndSelect('card.book', 'book')
            .where('card.bookId IN (:...bookIds)', { bookIds: suggestionBookIds })
            .andWhere(`NOT EXISTS (${undeckedCardSubquery.getQuery()})`)
            .setParameters(undeckedCardSubquery.getParameters())
            .orderBy('card.createdAt', 'DESC')
            .getMany()
        : [];

    const candidateCardsByBookId = new Map<number, Card[]>();
    candidateCards.forEach((card) => {
      const bookId = card.book.id;
      const current = candidateCardsByBookId.get(bookId) ?? [];
      current.push(card);
      candidateCardsByBookId.set(bookId, current);
    });

    return {
      revisitCards: revisitCardStack.items,
      currentReadingBooks: currentReadingBooks.map((book) =>
        this.mapBookSummary(book as Book & { cardCount?: number }),
      ),
      recentRecordedBooks: recentRecordedBookIds
        .map((id) => recentRecordedBookMap.get(id))
        .filter((book): book is Book & { cardCount?: number } => Boolean(book))
        .map((book) => this.mapBookSummary(book)),
      deckSuggestions: rawDeckSuggestionRows
        .map((row) => {
          const bookId = Number(row.bookId);
          const book = suggestionBookMap.get(bookId);

          if (!book) {
            return null;
          }

          const cards = (candidateCardsByBookId.get(bookId) ?? [])
            .slice(0, 3)
            .map((card) => ({
              id: card.id,
              type: card.type,
              quote: card.quote ?? null,
              thought: card.thought,
              createdAt: card.createdAt,
            }));

          return {
            bookId,
            bookTitle: book.title,
            bookAuthor: book.author,
            backgroundImage: this.s3Service.resolvePublicUrl(
              book.backgroundImage,
            ),
            candidateCardCount: Number(row.candidateCardCount),
            candidateCardIds: (candidateCardsByBookId.get(bookId) ?? []).map(
              (card) => card.id,
            ),
            cards,
          };
        })
        .filter(
          (
            item,
          ): item is {
            bookId: number;
            bookTitle: string;
            bookAuthor: string;
            backgroundImage: string | null;
            candidateCardCount: number;
            candidateCardIds: number[];
            cards: Array<{
              id: number;
              type: Card['type'];
              quote: string | null;
              thought: string;
              createdAt: Date;
            }>;
          } => Boolean(item),
        ),
    };
  }

  async getLatestBookList(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('해당 유저가 존재하지 않습니다.');
    }

    const rawBookIds = await this.cardRepository
      .createQueryBuilder('card')
      .innerJoin('card.book', 'book')
      .select('card.bookId', 'bookId')
      .addSelect('MAX(card.createdAt)', 'lastCardAt')
      .where('book.userId = :userId', { userId })
      .groupBy('card.bookId')
      .orderBy('MAX(card.createdAt)', 'DESC')
      .take(10)
      .getRawMany();

    const bookIds = rawBookIds.map((row) => Number(row.bookId));
    if (bookIds.length === 0) {
      return { items: [] };
    }

    const books = await this.bookRepository.findBy({ id: In(bookIds) });
    const bookMap = new Map(books.map((book) => [book.id, book]));
    const orderedBooks = bookIds
      .map((id) => bookMap.get(id))
      .filter((book): book is Book => Boolean(book));

    return { items: orderedBooks.map((book) => this.mapBookImage(book)) };
  }
}
