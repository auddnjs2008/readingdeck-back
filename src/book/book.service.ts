import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from './entity/book.entity';
import { Repository } from 'typeorm';
import { CreateBookDto } from './dto/create-book.dto';
import { User } from 'src/user/entity/user.entity';
import { S3Service } from 'src/common/service/s3.service';
import { BookSortType, FilterBookQueryDto } from './dto/filter-book-query.dto';

@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly s3Service: S3Service,
  ) {}

  async getBooks(query: FilterBookQueryDto) {
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
