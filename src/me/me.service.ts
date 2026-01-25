import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from 'src/book/entity/book.entity';
import { User } from 'src/user/entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MeService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

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
}
