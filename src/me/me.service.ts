import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from 'src/book/entity/book.entity';
import { Card } from 'src/card/entity/card.entity';
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
  ) {}

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

    return { items: latestCards };
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
      .orderBy('lastCardAt', 'DESC')
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

    return { items: orderedBooks };
  }
}
