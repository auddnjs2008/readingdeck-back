import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Card } from './entity/card.entity';
import { CardReflection } from './entity/card-reflection.entity';
import { CreateReflectionDto } from './dto/create-reflection.dto';

@Injectable()
export class CardReflectionService {
  constructor(
    @InjectRepository(Card) private readonly cards: Repository<Card>,
    @InjectRepository(CardReflection)
    private readonly reflections: Repository<CardReflection>,
    private readonly source: DataSource,
  ) {}

  private async owned(userId: number, cardId: number) {
    const card = await this.cards.findOne({
      where: { id: cardId },
      relations: { book: { user: true } },
    });
    if (!card) throw new NotFoundException('카드를 찾을 수 없습니다.');
    if (card.book.user.id !== userId)
      throw new ForbiddenException('접근 권한이 없습니다.');
    return card;
  }

  async create(userId: number, cardId: number, dto: CreateReflectionDto) {
    await this.owned(userId, cardId);
    await this.reflections
      .createQueryBuilder()
      .insert()
      .values({
        cardId,
        reaction: dto.reaction,
        note: dto.note?.trim() || null,
        requestId: dto.requestId,
      })
      .orIgnore()
      .execute();
    return this.reflections.findOneByOrFail({
      cardId,
      requestId: dto.requestId,
    });
  }

  async list(userId: number, cardId: number, cursor?: number) {
    await this.owned(userId, cardId);
    const rows = await this.reflections.find({
      where: { cardId, ...(cursor ? { id: LessThan(cursor) } : {}) },
      order: { id: 'DESC' },
      take: 21,
    });
    const items = rows.slice(0, 20);
    return { items, nextCursor: rows.length > 20 ? items[19].id : null };
  }

  async remove(userId: number, cardId: number, id: number) {
    await this.owned(userId, cardId);
    await this.reflections.delete({ id, cardId });
  }

  async related(userId: number, cardId: number) {
    const card = await this.owned(userId, cardId);
    const items = await this.source.query(
      `
      SELECT c.id, c.thought, c.quote, b.id AS "bookId", b.title AS "bookTitle", b.author
      FROM card_embedding candidate
      JOIN card c ON c.id = candidate."cardId"
      JOIN book b ON b.id = c."bookId"
      JOIN card_embedding original ON original."cardId" = $2 AND original."userId" = $1
      WHERE candidate."userId" = $1 AND b."userId" = $1 AND b.id <> $3
        AND candidate."embeddingModel" = original."embeddingModel"
      ORDER BY candidate.embedding <=> original.embedding, c.id
      LIMIT 3
    `,
      [userId, cardId, card.book.id],
    );
    return { items };
  }
}
