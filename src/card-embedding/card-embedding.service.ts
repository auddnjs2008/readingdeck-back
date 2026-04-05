import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from 'src/card/entity/card.entity';
import { Repository } from 'typeorm';
import { CardEmbedding } from './entity/card-embedding.entity';
import { EmbeddingService } from 'src/embedding/embedding.service';

@Injectable()
export class CardEmbeddingService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardEmbedding)
    private readonly cardEmbeddingRepository: Repository<CardEmbedding>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async upsertForCard(cardId: number) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
      relations: {
        book: {
          user: true,
        },
      },
    });

    if (!card) {
      throw new NotFoundException('임베딩할 카드를 찾을 수 없습니다.');
    }

    const content = this.buildEmbeddingContent(card);
    const embedding = await this.embeddingService.embedText(content);

    const existing = await this.cardEmbeddingRepository.findOne({
      where: { cardId: card.id },
    });

    if (existing) {
      existing.userId = card.book.user.id;
      existing.bookId = card.book.id;
      existing.content = content;
      existing.embeddingModel = 'text-embedding-3-small';
      existing.embedding = embedding;

      return this.cardEmbeddingRepository.save(existing);
    }

    const created = this.cardEmbeddingRepository.create({
      cardId: card.id,
      userId: card.book.user.id,
      bookId: card.book.id,
      content,
      embeddingModel: 'text-embedding-3-small',
      embedding,
    });

    return this.cardEmbeddingRepository.save(created);
  }

  async removeForCard(cardId: number) {
    await this.cardEmbeddingRepository.delete({ cardId });
  }

  private buildEmbeddingContent(card: Card) {
    const parts = [
      `책 제목: ${card.book.title}`,
      `저자: ${card.book.author}`,
      `카드 유형: ${card.type}`,
    ];

    if (card.quote?.trim()) {
      parts.push(`인용: ${card.quote.trim()}`);
    }

    parts.push(`생각: ${card.thought.trim()}`);

    if (card.pageStart != null && card.pageEnd != null) {
      parts.push(`페이지: ${card.pageStart}-${card.pageEnd}`);
    } else if (card.pageStart != null) {
      parts.push(`페이지: ${card.pageStart}`);
    } else if (card.pageEnd != null) {
      parts.push(`페이지: ${card.pageEnd}`);
    }

    return parts.join('\n');
  }

  async searchRelevantCards(userId: number, query: string, limit = 5) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }
    const queryEmbedding = await this.embeddingService.embedText(trimmedQuery);
    const vectorLiteral = this.toVectorLiteral(queryEmbedding);

    const rows = await this.cardEmbeddingRepository.query(
      `
        SELECT
          ce."cardId",
          ce."bookId",
          ce."content",
          ce."embeddingModel",
          ce.embedding <=> $2::vector AS distance
        FROM "card_embedding" ce
        WHERE ce."userId" = $1
        ORDER BY ce.embedding <=> $2::vector ASC
        LIMIT $3
      `,
      [userId, vectorLiteral, limit],
    );

    return rows.map((row: any) => ({
      cardId: Number(row.cardId),
      bookId: row.bookId != null ? Number(row.bookId) : null,
      content: row.content,
      embeddingModel: row.embeddingModel,
      distance: Number(row.distance),
    }));
  }

  private toVectorLiteral(values: number[]) {
    return `[${values.join(',')}]`;
  }
}
