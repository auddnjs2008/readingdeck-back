import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { CreateDeckDto } from './dto/create-deck.dto';
import { PublishDeckDto } from './dto/publish-deck.dto';
import { UpdateDeckGraphDto } from './dto/update-deck-graph.dto';
import { DeckService } from './deck.service';

@Controller('decks')
export class DeckController {
  constructor(private readonly deckService: DeckService) {}

  @Post()
  createDeck(@Req() req: any, @Body() createDeckDto: CreateDeckDto) {
    const userId = req.user.sub;
    return this.deckService.createDeck(userId, createDeckDto);
  }

  @Get(':deckId')
  getDeck(@Req() req: any, @Param('deckId', ParseIntPipe) deckId: number) {
    const userId = req.user.sub;
    return this.deckService.getDeck(userId, deckId);
  }

  @Put(':deckId/graph')
  updateDeckGraph(
    @Req() req: any,
    @Param('deckId', ParseIntPipe) deckId: number,
    @Body() updateDeckGraphDto: UpdateDeckGraphDto,
  ) {
    const userId = req.user.sub;
    return this.deckService.updateDeckGraph(userId, deckId, updateDeckGraphDto);
  }

  @Post(':deckId/publish')
  publishDeck(
    @Req() req: any,
    @Param('deckId', ParseIntPipe) deckId: number,
    @Body() publishDeckDto: PublishDeckDto,
  ) {
    const userId = req.user.sub;
    return this.deckService.publishDeck(userId, deckId, publishDeckDto);
  }
}
