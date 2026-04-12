import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { Repository } from 'typeorm';
import { AiHelpDocument } from './entity/ai-help-document.entity';

type HelpDocumentSource = {
  id: string;
  title: string;
  summary: string;
  how_to: string[];
  when_to_use: string;
};

@Injectable()
export class AiHelpDocumentSyncService {
  private readonly logger = new Logger(AiHelpDocumentSyncService.name);
  private readonly embeddingModel = 'text-embedding-3-small';

  constructor(
    @InjectRepository(AiHelpDocument)
    private readonly aiHelpDocumentRepository: Repository<AiHelpDocument>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async syncFromFile(
    filePath = join(process.cwd(), 'src/ai/help/help-documents.json'),
  ) {
    const documents = await this.readHelpDocuments(filePath);

    for (const document of documents) {
      await this.upsertDocument(document);
    }

    this.logger.log(`Synced ${documents.length} help documents.`);
  }

  private async readHelpDocuments(filePath: string) {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as HelpDocumentSource[];
  }

  private buildContent(document: HelpDocumentSource) {
    return [
      `질문: ${document.title}`,
      `설명: ${document.summary}`,
      '사용 방법:',
      ...document.how_to.map((step, index) => `${index + 1}. ${step}`),
      `언제 쓰면 좋은가: ${document.when_to_use}`,
    ].join('\n');
  }

  private createContentHash(content: string) {
    return createHash('sha256').update(content).digest('hex');
  }

  private async upsertDocument(document: HelpDocumentSource) {
    const content = this.buildContent(document);
    const contentHash = this.createContentHash(content);

    const existing = await this.aiHelpDocumentRepository.findOne({
      where: { slug: document.id },
    });

    if (existing && existing.contentHash === contentHash) {
      this.logger.log(`Skipped unchanged help document: ${document.id}`);
      return existing;
    }

    const embedding = await this.embeddingService.embedText(content);

    const entity = existing
      ? this.aiHelpDocumentRepository.merge(existing, {
          title: document.title,
          summary: document.summary,
          content,
          contentHash,
          embeddingModel: this.embeddingModel,
          embedding,
        })
      : this.aiHelpDocumentRepository.create({
          slug: document.id,
          title: document.title,
          summary: document.summary,
          content,
          contentHash,
          embeddingModel: this.embeddingModel,
          embedding,
        });

    const saved = await this.aiHelpDocumentRepository.save(entity);
    this.logger.log(`Synced help document: ${document.id}`);
    return saved;
  }
}
