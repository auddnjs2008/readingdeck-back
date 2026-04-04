import { Body, Controller, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Public } from 'src/auth/decorator/public.decorator';
import { envVariableKeys } from 'src/common/const/env.const';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post()
  async createFeedback(
    @Req() req: Request,
    @Body() createFeedbackDto: CreateFeedbackDto,
  ) {
    const token = req.cookies?.access_token;
    let userId: number | null = null;

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<{ sub: number }>(
          token,
          {
            secret: this.configService.get<string>(
              envVariableKeys.accessTokenSecret,
            ),
          },
        );
        userId = payload.sub;
      } catch {
        userId = null;
      }
    }

    return this.feedbackService.createFeedback(createFeedbackDto, userId);
  }
}
