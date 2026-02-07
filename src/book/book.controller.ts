import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { BookService } from './book.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateBookDto } from './dto/create-book.dto';
import { GetBookQueryDto } from './dto/get-book-query.dto';
import { GetBookCardsQueryDto } from './dto/get-bookcards-query.dto';
import { SearchBookQueryDto } from './dto/search-book-query.dto';

@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get()
  getBooks(@Req() req: any, @Query() query: GetBookQueryDto) {
    const userId = req.user.sub;
    return this.bookService.getBooks(userId, query);
  }

  @Get('bookId')
  getBook(@Param('bookId', ParseIntPipe) bookId: number) {
    return this.bookService.getBook(bookId);
  }

  @Get(':bookId/cards')
  getBookCards(
    @Req() req: any,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query() query: GetBookCardsQueryDto,
  ) {
    const userId = req.user.sub;
    return this.bookService.getBookCards(userId, bookId, query);
  }

  @Get('search')
  searchBooks(@Query() query: SearchBookQueryDto) {
    return this.bookService.searchBooks(query);
  }

  @Post()
  @UseInterceptors(FileInterceptor('backgroundImage'))
  create(
    @Req() req: any,
    @Body() createBookDto: CreateBookDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = req.user.sub;
    return this.bookService.createBook(createBookDto, userId, file);
  }
}
