import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AiHelpDocument } from './entity/ai-help-document.entity';
import { Repository } from 'typeorm';
import { EmbeddingService } from 'src/embedding/embedding.service';

@Injectable()
export class AiHelpDocumentService {
  constructor(
    @InjectRepository(AiHelpDocument)
    private readonly aiHelpDocumentRepository: Repository<AiHelpDocument>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  private toVectorLiteral(values: number[]) {
    return `[${values.join(',')}]`;
  }

  async searchRelevantHelpDocuments(query: string, limit = 3) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    const queryEmbedding = await this.embeddingService.embedText(trimmedQuery);
    const vectorLiteral = this.toVectorLiteral(queryEmbedding);

    const rows = await this.aiHelpDocumentRepository.query(
      `
        SELECT
          ahd.id,
          ahd.slug,
          ahd.title,
          ahd.summary,
          ahd.content,
          ahd."embeddingModel",
          ahd.embedding <=> $1::vector AS distance
        FROM "ai_help_document" ahd
        ORDER BY ahd.embedding <=> $1::vector ASC
        LIMIT $2
      `,
      [vectorLiteral, limit],
    );

    return rows.map((row: any) => ({
      id: Number(row.id),
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      content: row.content,
      embeddingModel: row.embeddingModel,
      distance: Number(row.distance),
    }));
  }
}
