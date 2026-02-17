import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { CardService } from './card.service';
import { GetTodayCardsQueryDto } from './dto/get-today-cards-query.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Controller('cards')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get('today')
  getTodayCards(@Req() req: any, @Query() query: GetTodayCardsQueryDto) {
    const userId = req.user.sub;
    return this.cardService.getTodayCards(userId, query);
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
}
