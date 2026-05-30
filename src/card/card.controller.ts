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
  Query,
  Req,
} from '@nestjs/common';
import { CardService } from './card.service';
import { GetRecentCardsQueryDto } from './dto/get-recent-cards-query.dto';
import { GetTodayCardsQueryDto } from './dto/get-today-cards-query.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Controller('cards')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get('recent')
  getRecentCards(@Req() req: any, @Query() query: GetRecentCardsQueryDto) {
    const userId = req.user.sub;
    return this.cardService.getRecentCards(userId, query.limit ?? 10);
  }

  @Get('today')
  getTodayCards(@Req() req: any, @Query() query: GetTodayCardsQueryDto) {
    const userId = req.user.sub;
    return this.cardService.getTodayCards(userId, query);
  }

  @Get(':cardId')
  getCardDetail(
    @Req() req: any,
    @Param('cardId', ParseIntPipe) cardId: number,
  ) {
    const userId = req.user.sub;
    return this.cardService.getCardDetail(userId, cardId);
  }

  @Patch(':cardId')
  updateCard(
    @Req() req: any,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() updateCardDto: UpdateCardDto,
  ) {
    const userId = req.user.sub;
    return this.cardService.updateCard(userId, cardId, updateCardDto);
  }

  @Patch(':cardId/revisit')
  revisitCard(@Req() req: any, @Param('cardId', ParseIntPipe) cardId: number) {
    const userId = req.user.sub;
    return this.cardService.revisitCard(userId, cardId);
  }

  @Delete(':cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCard(@Req() req: any, @Param('cardId', ParseIntPipe) cardId: number) {
    const userId = req.user.sub;
    return this.cardService.deleteCard(userId, cardId);
  }
}
