import { Body, Controller, Post, Req } from '@nestjs/common';
import { ChatDto } from './dto/chat.dto';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  chat(@Req() req: any, @Body() dto: ChatDto) {
    const userId = req.user.sub;
    return this.aiService.chat(userId, dto);
  }
}
