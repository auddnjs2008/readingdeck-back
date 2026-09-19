import { Body, Controller, Get, Header, Post, Req } from '@nestjs/common';
import { ChatDto } from './dto/chat.dto';
import { AiService } from './ai.service';
import { AiChatUsageService } from './ai-chat-usage.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiChatUsageService: AiChatUsageService,
  ) {}

  @Get('chat/usage')
  @Header('Cache-Control', 'no-store')
  usage(@Req() req: { user: { sub: number } }) {
    return this.aiChatUsageService.getUsage(req.user.sub);
  }

  @Post('chat')
  chat(@Req() req: any, @Body() dto: ChatDto) {
    const userId = req.user.sub;
    return this.aiService.chat(userId, dto);
  }
}
