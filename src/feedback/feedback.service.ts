import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Feedback } from './entity/feedback.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  async createFeedback(
    createFeedbackDto: CreateFeedbackDto,
    userId?: number | null,
  ) {
    const feedback = this.feedbackRepository.create({
      userId: userId ?? null,
      message: createFeedbackDto.message.trim(),
      pagePath: createFeedbackDto.pagePath?.trim() || null,
    });

    await this.feedbackRepository.save(feedback);

    return { ok: true };
  }
}
