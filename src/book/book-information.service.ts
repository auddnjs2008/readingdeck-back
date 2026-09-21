import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { KakaoBookService } from '../integrations/kakao/kakao-book.service';
import { KakaoBookTarget } from './dto/search-book-query.dto';
import { normalizeIsbn } from './isbn';

@Injectable()
export class BookInformationService {
  constructor(private readonly kakao: KakaoBookService) {}
  async get(raw: string) {
    const isbn = normalizeIsbn(raw);
    if (!isbn) throw new BadRequestException('올바른 ISBN이 아닙니다.');
    let result;
    try {
      result = await this.kakao.searchBooks({
        query: isbn,
        target: KakaoBookTarget.ISBN,
      });
    } catch {
      throw new ServiceUnavailableException(
        '책 정보를 잠시 불러올 수 없습니다.',
      );
    }
    const book = result.documents?.find(
      (book) => normalizeIsbn(book.isbn ?? '') === isbn,
    );
    if (!book) throw new NotFoundException('책 정보를 찾을 수 없습니다.');
    return {
      isbn,
      title: book.title,
      authors: book.authors ?? [],
      publisher: book.publisher,
      publishedAt: book.datetime || null,
      description: book.contents || null,
      coverUrl: book.thumbnail || null,
    };
  }
}
