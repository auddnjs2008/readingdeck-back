import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateDeckDto } from './dto/create-deck.dto';
import { PublishDeckDto } from './dto/publish-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { UpdateDeckGraphDto } from './dto/update-deck-graph.dto';
import { DeckService } from './deck.service';
import { GetDecksQueryDto } from './dto/get-decks-query.dto';
import { GetDecksResponseDto } from './dto/get-decks-response.dto';

@Controller('decks')
export class DeckController {
  constructor(private readonly deckService: DeckService) {}

  @Get('')
  getDecks(
    @Req() req: any,
    @Query() getDecksQueryDto: GetDecksQueryDto,
  ): Promise<GetDecksResponseDto> {
    const userId = req.user.sub;
    return this.deckService.getDecks(userId, getDecksQueryDto);
  }

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

  @Patch(':deckId')
  updateDeck(
    @Req() req: any,
    @Param('deckId', ParseIntPipe) deckId: number,
    @Body() updateDeckDto: UpdateDeckDto,
  ) {
    const userId = req.user.sub;
    return this.deckService.updateDeck(userId, deckId, updateDeckDto);
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

  @Delete(':deckId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDeck(@Req() req: any, @Param('deckId', ParseIntPipe) deckId: number) {
    const userId = req.user.sub;
    return this.deckService.deleteDeck(userId, deckId);
  }
}
