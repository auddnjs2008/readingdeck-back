import { Controller, Get, Query, Req } from '@nestjs/common';
import { CardService } from './card.service';
import { GetTodayCardsQueryDto } from './dto/get-today-cards-query.dto';

@Controller('cards')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get('today')
  getTodayCards(@Req() req: any, @Query() query: GetTodayCardsQueryDto) {
    const userId = req.user.sub;
    return this.cardService.getTodayCards(userId, query);
  }
}
