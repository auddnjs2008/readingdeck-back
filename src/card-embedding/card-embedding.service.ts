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
    const typeLabelMap: Record<Card['type'], string> = {
      insight: '인사이트',
      change: '변화',
      action: '실천',
      question: '질문',
    };

    const normalizeText = (value?: string | null) =>
      value?.replace(/\s+/g, ' ').trim() ?? '';

    const normalizedThought = normalizeText(card.thought);
    const normalizedQuote = normalizeText(card.quote);
    const truncatedQuote =
      normalizedQuote && normalizedQuote.length > 280
        ? `${normalizedQuote.slice(0, 280)}...`
        : normalizedQuote;
    const typeLabel = typeLabelMap[card.type];

    const parts = [
      ...(card.title?.trim() ? [`카드 제목: ${normalizeText(card.title)}`] : []),
      `생각 메모: ${normalizedThought}`,
      `카드 유형: ${typeLabel} (${card.type})`,
      `책 제목: ${card.book.title}`,
      `저자: ${card.book.author}`,
    ];

    if (truncatedQuote) {
      parts.push(`인용 문장: ${truncatedQuote}`);
    }

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

  async getCardsByIds(cardIds: number[]) {
    if (cardIds.length === 0) {
      return [];
    }

    const cards = await this.cardRepository.find({
      where: cardIds.map((id) => ({ id })),
      relations: {
        book: true,
      },
    });

    const cardMap = new Map(cards.map((card) => [card.id, card]));

    return cardIds
      .map((id) => cardMap.get(id))
      .filter((card): card is Card => Boolean(card))
      .map((card) => ({
        cardId: card.id,
        type: card.type,
        thought: card.thought,
        quote: card.quote ?? null,
        bookTitle: card.book.title,
        author: card.book.author,
        pageStart: card.pageStart ?? null,
        pageEnd: card.pageEnd ?? null,
      }));
  }
}
