jest.mock('../common/service/s3.service', () => ({ S3Service: class {} }));
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { normalizeIsbn } from './isbn';
import { BookInformationService } from './book-information.service';
import { BookService } from './book.service';

describe('ISBN과 공개 책 정보', () => {
  it.each([
    '9780306406157',
    '0306406152',
    '0306406152 9780306406157',
    '978-0-306-40615-7',
  ])('ISBN %s를 ISBN13으로 정규화한다', (value) => {
    expect(normalizeIsbn(value)).toBe('9780306406157');
  });
  it.each(['', '책 제목', '9780306406158', '0306406153'])(
    '유효하지 않은 ISBN %s를 거절한다',
    (value) => {
      expect(normalizeIsbn(value)).toBeNull();
    },
  );
  const setup = () => {
    const kakao = {
      searchBooks: jest
        .fn()
        .mockResolvedValue({
          documents: [
            {
              isbn: '0306406152 9780306406157',
              title: '책',
              authors: ['저자'],
              publisher: '출판사',
              contents: '소개',
              datetime: '2020-01-01',
              thumbnail: 'https://example.com/cover.jpg',
              user: { id: 7 },
            },
          ],
        }),
    };
    return { kakao, service: new BookInformationService(kakao as any) };
  };
  it('ISBN 검색 결과의 공개 필드만 반환한다', async () => {
    const { service, kakao } = setup();
    expect(await service.get('9780306406157')).toEqual({
      isbn: '9780306406157',
      title: '책',
      authors: ['저자'],
      publisher: '출판사',
      description: '소개',
      publishedAt: '2020-01-01',
      coverUrl: 'https://example.com/cover.jpg',
    });
    expect(kakao.searchBooks).toHaveBeenCalledWith({
      query: '9780306406157',
      target: 'isbn',
    });
  });
  it('잘못된 번호는 카카오 요청 없이 거절한다', async () => {
    const { service, kakao } = setup();
    await expect(service.get('invalid')).rejects.toThrow(BadRequestException);
    expect(kakao.searchBooks).not.toHaveBeenCalled();
  });
  it('검색 결과에 정확한 ISBN이 없으면 404를 반환한다', async () => {
    const { service, kakao } = setup();
    kakao.searchBooks.mockResolvedValue({
      documents: [{ isbn: '9780140328721' }],
    });
    await expect(service.get('9780306406157')).rejects.toThrow(
      NotFoundException,
    );
  });
  it('카카오 실패는 일시 오류로 반환한다', async () => {
    const { service, kakao } = setup();
    kakao.searchBooks.mockRejectedValue(new Error('secret'));
    await expect(service.get('9780306406157')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

describe('같은 ISBN의 책 등록', () => {
  it('같은 사용자의 기존 책을 반환하고 상태를 덮어쓰지 않는다', async () => {
    const existing = {
      id: 4,
      isbn: '9780306406157',
      title: '기존 책',
      status: 'reading',
    };
    const books = {
      findOne: jest.fn().mockResolvedValue(existing),
      save: jest.fn(),
    };
    const service = new BookService(
      books as any,
      { findOne: async () => ({ id: 7 }) } as any,
      {} as any,
      { resolvePublicUrl: (v) => v } as any,
      {} as any,
    );
    expect(
      await service.createBook(
        {
          isbn: '0306406152',
          title: '새 제목',
          author: '저자',
          publisher: '출판사',
        } as any,
        7,
      ),
    ).toMatchObject(existing);
    expect(books.findOne).toHaveBeenCalledWith({
      where: { user: { id: 7 }, isbn: '9780306406157' },
    });
    expect(books.save).not.toHaveBeenCalled();
  });
  it('동시 등록의 해당 unique 충돌만 기존 책으로 복구한다', async () => {
    const books = {
      findOne: async () => null,
      create: (value) => value,
      save: async () => {
        throw {
          driverError: { code: '23505', constraint: 'UQ_book_user_isbn' },
        };
      },
      findOneOrFail: jest.fn().mockResolvedValue({ id: 4 }),
    };
    const service = new BookService(
      books as any,
      { findOne: async () => ({ id: 7 }) } as any,
      {} as any,
      { resolvePublicUrl: (v) => v } as any,
      {} as any,
    );
    expect(
      await service.createBook(
        {
          isbn: '9780306406157',
          title: '책',
          author: '저자',
          publisher: '출판사',
        } as any,
        7,
      ),
    ).toMatchObject({ id: 4 });
    expect(books.findOneOrFail).toHaveBeenCalledWith({
      where: { user: { id: 7 }, isbn: '9780306406157' },
    });
  });
});
