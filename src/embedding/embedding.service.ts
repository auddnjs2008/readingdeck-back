import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY가 없습니다.');
    }

    this.openai = new OpenAI({ apiKey });
  }

  async embedText(text: string): Promise<number[]> {
    const input = text.trim();

    if (!input) {
      throw new InternalServerErrorException(
        '임베딩할 텍스트가 비어 있습니다.',
      );
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input,
    });

    return response.data[0].embedding;
  }
}
