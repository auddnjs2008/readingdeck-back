import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CardReflectionService } from './card-reflection.service';
import {
  CreateReflectionDto,
  ReflectionQueryDto,
} from './dto/create-reflection.dto';

@Controller('cards/:cardId')
export class CardReflectionController {
  constructor(private readonly service: CardReflectionService) {}

  @Get('reflections')
  list(
    @Req() req: any,
    @Param('cardId', ParseIntPipe) id: number,
    @Query() query: ReflectionQueryDto,
  ) {
    return this.service.list(req.user.sub, id, query.cursor);
  }

  @Post('reflections')
  create(
    @Req() req: any,
    @Param('cardId', ParseIntPipe) id: number,
    @Body() dto: CreateReflectionDto,
  ) {
    return this.service.create(req.user.sub, id, dto);
  }

  @Delete('reflections/:reflectionId')
  @HttpCode(204)
  remove(
    @Req() req: any,
    @Param('cardId', ParseIntPipe) id: number,
    @Param('reflectionId', ParseIntPipe) reflectionId: number,
  ) {
    return this.service.remove(req.user.sub, id, reflectionId);
  }

  @Get('related')
  related(@Req() req: any, @Param('cardId', ParseIntPipe) id: number) {
    return this.service.related(req.user.sub, id);
  }
}
