import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
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
import { GetBookCardsQueryDto } from '../card/dto/get-bookcards-query.dto';
import { SearchBookQueryDto } from './dto/search-book-query.dto';
import { CreateCardDto } from 'src/card/dto/create-card.dto';
import { CardService } from 'src/card/card.service';
import { UpdateBookDto } from './dto/update-book.dto';

@Controller('books')
export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly cardService: CardService,
  ) {}

  @Get()
  getBooks(@Req() req: any, @Query() query: GetBookQueryDto) {
    const userId = req.user.sub;
    return this.bookService.getBooks(userId, query);
  }

  @Get('search')
  searchBooks(@Query() query: SearchBookQueryDto) {
    return this.bookService.searchBooks(query);
  }

  @Get(':bookId')
  getBook(@Req() req: any, @Param('bookId', ParseIntPipe) bookId: number) {
    const userId = req.user.sub;
    return this.bookService.getBook(userId, bookId);
  }

  @Patch(':bookId')
  updateBook(
    @Req() req: any,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() updateBookDto: UpdateBookDto,
  ) {
    const userId = req.user.sub;
    return this.bookService.updateBook(userId, bookId, updateBookDto);
  }

  @Get(':bookId/cards')
  getBookCards(
    @Req() req: any,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query() query: GetBookCardsQueryDto,
  ) {
    const userId = req.user.sub;
    return this.cardService.getBookCards(userId, bookId, query);
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

  @Post(':bookId/cards')
  createCard(
    @Req() req: any,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() createCardDto: CreateCardDto,
  ) {
    const userId = req.user.sub;
    return this.cardService.createCard(userId, bookId, createCardDto);
  }

  @Delete(':bookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBook(@Req() req: any, @Param('bookId', ParseIntPipe) bookId: number) {
    const userId = req.user.sub;
    return this.bookService.deleteBook(userId, bookId);
  }
}
