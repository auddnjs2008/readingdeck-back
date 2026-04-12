import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from 'src/book/entity/book.entity';
import { Card } from 'src/card/entity/card.entity';
import { CommunityPost } from 'src/community/entity/community-post.entity';
import { DeckConnection } from 'src/deck-connection/entity/deck-connection.entity';
import { DeckNode, DeckNodeType } from 'src/deck-node/entity/deck-node.entity';
import { User } from 'src/user/entity/user.entity';
import { DataSource, In, Repository } from 'typeorm';
import { CreateDeckDto } from './dto/create-deck.dto';
import { GetDecksQueryDto } from './dto/get-decks-query.dto';
import { GetDecksResponseDto } from './dto/get-decks-response.dto';
import { PublishDeckDto } from './dto/publish-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { UpdateDeckGraphDto } from './dto/update-deck-graph.dto';
import { Deck, DeckMode, DeckStatus } from './entity/deck.entity';
import { S3Service } from 'src/common/service/s3.service';

type DeckListRawRow = {
  id: number;
  name: string;
  description: string | null;
  status: DeckStatus;
  mode: DeckMode;
  isShared: boolean | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  preview: Deck['preview'];
  previewUpdatedAt: Date | string | null;
  nodeCount: string | number;
  connectionCount: string | number;
};

@Injectable()
export class DeckService {
  constructor(
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(DeckNode)
    private readonly deckNodeRepository: Repository<DeckNode>,
    @InjectRepository(DeckConnection)
    private readonly deckConnectionRepository: Repository<DeckConnection>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CommunityPost)
    private readonly communityPostRepository: Repository<CommunityPost>,
    private readonly s3Service: S3Service,
    private readonly dataSource: DataSource,
  ) {}

  private normalizeDescription(description?: string | null) {
    const normalized = description?.trim();
    return normalized ? normalized : null;
  }

  async getDecks(
    userId: number,
    dto: GetDecksQueryDto,
  ): Promise<GetDecksResponseDto> {
    await this.ensureUserExists(userId);

    const take = Math.min(dto.take ?? 12, 50);
    const offset = dto.cursor ?? 0;
    const sortType: 'ASC' | 'DESC' = dto.sort === 'oldest' ? 'ASC' : 'DESC';

    const qb = this.deckRepository
      .createQueryBuilder('deck')
      .where('deck.userId = :userId', { userId });

    if (dto.status) {
      qb.andWhere('deck.status = :status', { status: dto.status });
    }

    if (dto.mode) {
      qb.andWhere('deck.mode = :mode', { mode: dto.mode });
    }

    if (dto.keyword?.trim()) {
      qb.andWhere('deck.name ILIKE :keyword', {
        keyword: `%${dto.keyword.trim()}%`,
      });
    }

    if (dto.shared === true) {
      qb.andWhere(
        `EXISTS (${qb
          .subQuery()
          .select('1')
          .from(CommunityPost, 'communityPost')
          .where('communityPost.deckId = deck.id')
          .getQuery()})`,
      );
    }

    const total = await qb.clone().getCount();

    const rows = await qb
      .select('deck.id', 'id')
      .addSelect('deck.name', 'name')
      .addSelect('deck.description', 'description')
      .addSelect('deck.status', 'status')
      .addSelect('deck.mode', 'mode')
      .addSelect(
        `EXISTS (${this.deckRepository
          .createQueryBuilder()
          .subQuery()
          .select('1')
          .from(CommunityPost, 'communityPost')
          .where('communityPost.deckId = deck.id')
          .getQuery()})`,
        'isShared',
      )
      .addSelect('deck.createdAt', 'createdAt')
      .addSelect('deck.updatedAt', 'updatedAt')
      .addSelect('deck.preview', 'preview')
      .addSelect('deck.previewUpdatedAt', 'previewUpdatedAt')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(1)')
            .from(DeckNode, 'node')
            .where('node.deckId = deck.id'),
        'nodeCount',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(1)')
            .from(DeckConnection, 'conn')
            .where('conn.deckId = deck.id'),
        'connectionCount',
      )
      .orderBy('deck.updatedAt', sortType)
      .addOrderBy('deck.id', sortType)
      .take(take)
      .skip(offset)
      .getRawMany<DeckListRawRow>();

    const mappedItems = rows.map((row) => {
      const createdAt =
        row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);
      const updatedAt =
        row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt);
      const previewUpdatedAt =
        row.previewUpdatedAt == null
          ? null
          : row.previewUpdatedAt instanceof Date
            ? row.previewUpdatedAt
            : new Date(row.previewUpdatedAt);

      return {
        id: Number(row.id),
        name: row.name,
        description: row.description ?? null,
        status: row.status,
        mode: row.mode,
        isShared:
          typeof row.isShared === 'boolean'
            ? row.isShared
            : row.isShared === 'true',
        createdAt,
        updatedAt,
        preview: row.preview ?? null,
        previewUpdatedAt,
        nodeCount: Number(row.nodeCount ?? 0),
        connectionCount: Number(row.connectionCount ?? 0),
      };
    });

    return {
      items: mappedItems,
      meta: {
        total,
        take,
        cursor: offset,
        nextCursor: offset + rows.length < total ? offset + rows.length : null,
      },
    };
  }

  async createDeck(userId: number, dto: CreateDeckDto) {
    await this.ensureUserExists(userId);
    const nodes = dto.nodes ?? [];
    const connections = dto.connections ?? [];
    await this.validateNodeAssetsOwnership(userId, nodes);

    return this.dataSource.transaction(async (manager) => {
      const deckRepo = manager.getRepository(Deck);
      const nodeRepo = manager.getRepository(DeckNode);
      const connectionRepo = manager.getRepository(DeckConnection);

      const deck = await deckRepo.save(
        deckRepo.create({
          name: dto.name?.trim() || 'Untitled Deck',
          description: this.normalizeDescription(dto.description),
          status: dto.status ?? DeckStatus.DRAFT,
          mode: dto.mode ?? DeckMode.GRAPH,
          userId,
        }),
      );

      const createdNodes = await nodeRepo.save(
        nodes.map((node, index) =>
          nodeRepo.create({
            deckId: deck.id,
            type: node.type,
            clientKey: node.clientKey ?? null,
            bookId:
              node.type === DeckNodeType.BOOK ? (node.bookId ?? null) : null,
            cardId:
              node.type === DeckNodeType.CARD ? (node.cardId ?? null) : null,
            positionX: node.positionX,
            positionY: node.positionY,
            order: node.order ?? index,
          }),
        ),
      );

      const nodeIdByClientKey = new Map<string, number>();
      createdNodes.forEach((node) => {
        if (node.clientKey) {
          nodeIdByClientKey.set(node.clientKey, node.id);
        }
      });

      const createdConnections = await this.saveConnectionsFromSnapshot(
        connectionRepo,
        deck.id,
        connections,
        nodeIdByClientKey,
      );

      const preview = await this.buildDeckPreview(
        deck.mode,
        createdNodes,
        createdConnections,
      );
      const savedDeck = await deckRepo.save({
        ...deck,
        preview,
        previewUpdatedAt: new Date(),
      });

      return {
        ...savedDeck,
        nodes: createdNodes,
        connections: createdConnections,
      };
    });
  }

  async getDeck(userId: number, deckId: number) {
    const deck = await this.findOwnedDeck(userId, deckId);

    const [nodes, connections, sharedPost] = await Promise.all([
      this.deckNodeRepository
        .createQueryBuilder('node')
        .leftJoinAndSelect('node.book', 'book')
        .leftJoinAndSelect('node.card', 'card')
        .leftJoinAndSelect('card.book', 'cardBook')
        .where('node.deckId = :deckId', { deckId })
        .orderBy('node.order', 'ASC')
        .addOrderBy('node.id', 'ASC')
        .select([
          'node.id',
          'node.deckId',
          'node.type',
          'node.clientKey',
          'node.bookId',
          'node.cardId',
          'node.positionX',
          'node.positionY',
          'node.order',
          'node.createdAt',
          'node.updatedAt',
          'node.version',
          'book.id',
          'book.title',
          'book.author',
          'book.publisher',
          'book.backgroundImage',
          'book.createdAt',
          'book.updatedAt',
          'book.version',
          'card.id',
          'card.type',
          'card.title',
          'card.quote',
          'card.thought',
          'card.backgroundImage',
          'card.pageStart',
          'card.pageEnd',
          'card.createdAt',
          'card.updatedAt',
          'card.version',
          'cardBook.id',
          'cardBook.title',
          'cardBook.author',
          'cardBook.publisher',
          'cardBook.backgroundImage',
          'cardBook.createdAt',
          'cardBook.updatedAt',
          'cardBook.version',
        ])
        .getMany(),
      this.deckConnectionRepository.find({
        where: { deckId },
        order: { id: 'ASC' },
      }),
      this.communityPostRepository.findOne({
        where: { deckId },
        select: { id: true },
      }),
    ]);

    const normalizedNodes = nodes.map((node) => {
      const relatedBook = node.book ?? node.card?.book ?? null;
      const resolvedBookId = node.bookId ?? relatedBook?.id ?? null;

      return {
        ...node,
        bookId: resolvedBookId,
        book: relatedBook
          ? {
              id: relatedBook.id,
              title: relatedBook.title,
              author: relatedBook.author,
              publisher: relatedBook.publisher,
              backgroundImage: this.s3Service.resolvePublicUrl(
                relatedBook.backgroundImage,
              ),
              createdAt: relatedBook.createdAt,
              updatedAt: relatedBook.updatedAt,
              version: relatedBook.version,
            }
          : null,
        card: node.card
          ? {
              id: node.card.id,
              type: node.card.type,
              title: node.card.title ?? null,
              quote: node.card.quote ?? null,
              thought: node.card.thought,
              backgroundImage: this.s3Service.resolvePublicUrl(
                node.card.backgroundImage,
              ),
              pageStart: node.card.pageStart ?? null,
              pageEnd: node.card.pageEnd ?? null,
              createdAt: node.card.createdAt,
              updatedAt: node.card.updatedAt,
              version: node.card.version,
            }
          : null,
      };
    });

    return {
      ...deck,
      isShared: Boolean(sharedPost?.id),
      sharedPostId: sharedPost?.id ?? null,
      nodes: normalizedNodes,
      connections,
    };
  }

  async updateDeck(userId: number, deckId: number, dto: UpdateDeckDto) {
    const deck = await this.findOwnedDeck(userId, deckId);

    if (dto.name?.trim()) {
      deck.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      deck.description = this.normalizeDescription(dto.description);
    }
    if (dto.mode) {
      deck.mode = dto.mode;
    }

    const savedDeck = await this.deckRepository.save(deck);

    return {
      id: savedDeck.id,
      name: savedDeck.name,
      description: savedDeck.description,
      status: savedDeck.status,
      mode: savedDeck.mode,
      updatedAt: savedDeck.updatedAt,
    };
  }

  async updateDeckGraph(
    userId: number,
    deckId: number,
    dto: UpdateDeckGraphDto,
  ) {
    const deck = await this.findOwnedDeck(userId, deckId);
    const nodes = dto.nodes ?? [];
    const connections = dto.connections ?? [];
    await this.validateNodeAssetsOwnership(userId, nodes);

    return this.dataSource.transaction(async (manager) => {
      const nodeRepo = manager.getRepository(DeckNode);
      const connectionRepo = manager.getRepository(DeckConnection);
      const deckRepo = manager.getRepository(Deck);

      await connectionRepo.delete({ deckId });
      await nodeRepo.delete({ deckId });

      const savedNodes = await nodeRepo.save(
        nodes.map((node, index) =>
          nodeRepo.create({
            deckId,
            type: node.type,
            clientKey: node.clientKey ?? null,
            bookId:
              node.type === DeckNodeType.BOOK ? (node.bookId ?? null) : null,
            cardId:
              node.type === DeckNodeType.CARD ? (node.cardId ?? null) : null,
            positionX: node.positionX,
            positionY: node.positionY,
            order: node.order ?? index,
          }),
        ),
      );

      const nodeIdByClientKey = new Map<string, number>();
      savedNodes.forEach((node) => {
        if (node.clientKey) {
          nodeIdByClientKey.set(node.clientKey, node.id);
        }
      });

      const savedConnections = await this.saveConnectionsFromSnapshot(
        connectionRepo,
        deckId,
        connections,
        nodeIdByClientKey,
      );

      const preview = await this.buildDeckPreview(
        deck.mode,
        savedNodes,
        savedConnections,
      );
      const updatedDeck = await deckRepo.save({
        ...deck,
        preview,
        previewUpdatedAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        id: updatedDeck.id,
        status: updatedDeck.status,
        updatedAt: updatedDeck.updatedAt,
        nodes: savedNodes,
        connections: savedConnections,
      };
    });
  }

  async publishDeck(userId: number, deckId: number, dto: PublishDeckDto) {
    const deck = await this.findOwnedDeck(userId, deckId);

    const nodeCount = await this.deckNodeRepository.count({
      where: { deckId },
    });
    if (nodeCount < 1) {
      throw new BadRequestException('발행하려면 최소 1개의 노드가 필요합니다.');
    }

    if (dto.name?.trim()) {
      deck.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      deck.description = this.normalizeDescription(dto.description);
    }
    deck.status = DeckStatus.PUBLISHED;

    const savedDeck = await this.deckRepository.save(deck);

    return {
      id: savedDeck.id,
      name: savedDeck.name,
      description: savedDeck.description,
      status: savedDeck.status,
      mode: savedDeck.mode,
      updatedAt: savedDeck.updatedAt,
    };
  }

  async deleteDeck(userId: number, deckId: number) {
    const deck = await this.findOwnedDeck(userId, deckId);

    await this.deckRepository.delete({ id: deck.id });
  }

  private async buildDeckPreview(
    mode: DeckMode,
    nodes: DeckNode[],
    edges: DeckConnection[],
  ) {
    if (mode === DeckMode.LIST) {
      return this.buildDeckListPreview(nodes);
    }

    return this.buildDeckGraphPreview(nodes, edges);
  }

  private buildDeckGraphPreview(nodes: DeckNode[], edges: DeckConnection[]) {
    if (nodes.length === 0) {
      return {
        version: 1 as const,
        kind: 'graph' as const,
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        nodeCount: 0,
        connectionCount: 0,
        nodes: [],
        edges: [],
      };
    }

    const bounds = nodes.reduce(
      (prev, cur) => ({
        minX: Math.min(prev.minX, cur.positionX),
        minY: Math.min(prev.minY, cur.positionY),
        maxX: Math.max(prev.maxX, cur.positionX),
        maxY: Math.max(prev.maxY, cur.positionY),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    );

    const spanX = Math.max(bounds.maxX - bounds.minX, 1);
    const spanY = Math.max(bounds.maxY - bounds.minY, 1);

    const previewPadding = 0.06;
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const round3 = (v: number) => Math.round(v * 1000) / 1000;
    const applyPadding = (v: number) =>
      previewPadding + v * (1 - previewPadding * 2);
    const nx = (x: number) =>
      round3(applyPadding(clamp01((x - bounds.minX) / spanX)));
    const ny = (y: number) =>
      round3(applyPadding(clamp01((y - bounds.minY) / spanY)));

    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const previewNodes = [...nodes]
      .sort((a, b) => b.id - a.id)
      .slice(0, 40)
      .map((item) => ({
        x: nx(item.positionX),
        y: ny(item.positionY),
        t: item.type, // "book" | "card"
      }));

    const previewEdges = [...edges]
      .sort((a, b) => b.id - a.id)
      .slice(0, 60)
      .map((item) => {
        const from = nodeById.get(item.fromNodeId);
        const to = nodeById.get(item.toNodeId);
        if (!from || !to) return null;

        return {
          sx: nx(from.positionX),
          sy: ny(from.positionY),
          tx: nx(to.positionX),
          ty: ny(to.positionY),
        };
      })
      .filter(
        (v): v is { sx: number; sy: number; tx: number; ty: number } =>
          v !== null,
      );

    return {
      version: 1 as const,
      kind: 'graph' as const,
      bounds,
      nodeCount: nodes.length,
      connectionCount: edges.length,
      nodes: previewNodes,
      edges: previewEdges,
    };
  }

  private async buildDeckListPreview(nodes: DeckNode[]) {
    const orderedCardNodes = [...nodes]
      .filter(
        (node): node is DeckNode & { cardId: number } =>
          node.type === DeckNodeType.CARD && node.cardId != null,
      )
      .sort((a, b) => {
        if (a.order === b.order) return a.id - b.id;
        return a.order - b.order;
      });

    if (orderedCardNodes.length === 0) {
      return {
        version: 1 as const,
        kind: 'list' as const,
        itemCount: 0,
        items: [],
      };
    }

    const previewTargetNodes = orderedCardNodes.slice(0, 5);
    const targetCardIds = previewTargetNodes.map((node) => node.cardId);

    const cards = await this.cardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.book', 'book')
      .where('card.id IN (:...cardIds)', { cardIds: targetCardIds })
      .select([
        'card.id',
        'card.type',
        'card.title',
        'card.thought',
        'book.id',
        'book.title',
        'book.backgroundImage',
      ])
      .getMany();

    const cardById = new Map(cards.map((card) => [card.id, card]));

    const items = previewTargetNodes.reduce<
      Array<{
        t: 'insight' | 'change' | 'action' | 'question';
        title: string;
        cover: string | null;
        book: string | null;
      }>
    >((acc, node) => {
      const card = cardById.get(node.cardId);
      if (!card) return acc;

      const normalizedTitle =
        card.title?.trim() || card.thought?.trim() || `Card #${card.id}`;
      const truncatedTitle =
        normalizedTitle.length > 40
          ? `${normalizedTitle.slice(0, 40)}...`
          : normalizedTitle;

      acc.push({
        t: card.type,
        title: truncatedTitle,
        cover: this.s3Service.resolvePublicUrl(card.book?.backgroundImage),
        book: card.book?.title ?? null,
      });
      return acc;
    }, []);

    return {
      version: 1 as const,
      kind: 'list' as const,
      itemCount: orderedCardNodes.length,
      items,
    };
  }

  private async saveConnectionsFromSnapshot(
    connectionRepo: Repository<DeckConnection>,
    deckId: number,
    connections: UpdateDeckGraphDto['connections'],
    nodeIdByClientKey: Map<string, number>,
  ) {
    const rows = connections.map((connection) => {
      const fromNodeId =
        connection.fromNodeId ??
        (connection.fromNodeClientKey
          ? nodeIdByClientKey.get(connection.fromNodeClientKey)
          : undefined);
      const toNodeId =
        connection.toNodeId ??
        (connection.toNodeClientKey
          ? nodeIdByClientKey.get(connection.toNodeClientKey)
          : undefined);

      if (!fromNodeId || !toNodeId) {
        throw new BadRequestException(
          'connection의 from/to node를 식별할 수 없습니다.',
        );
      }

      return connectionRepo.create({
        deckId,
        fromNodeId,
        toNodeId,
        type: connection.type ?? null,
        style: connection.style ?? null,
        animated: connection.animated ?? false,
        markerEnd: connection.markerEnd ?? null,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
        label: connection.label ?? null,
      });
    });

    if (rows.length === 0) {
      return [];
    }

    return connectionRepo.save(rows);
  }

  private async validateNodeAssetsOwnership(
    userId: number,
    nodes: { type: DeckNodeType; bookId?: number; cardId?: number }[],
  ) {
    const bookIds = nodes
      .filter((node) => node.type === DeckNodeType.BOOK && node.bookId)
      .map((node) => Number(node.bookId));
    const cardIds = nodes
      .filter((node) => node.type === DeckNodeType.CARD && node.cardId)
      .map((node) => Number(node.cardId));

    if (bookIds.length > 0) {
      const ownedBooks = await this.bookRepository.find({
        where: { id: In(bookIds), user: { id: userId } },
        select: { id: true },
        relations: { user: true },
      });
      if (ownedBooks.length !== new Set(bookIds).size) {
        throw new ForbiddenException(
          '타 유저의 book은 덱에 추가할 수 없습니다.',
        );
      }
    }

    if (cardIds.length > 0) {
      const cards = await this.cardRepository.find({
        where: { id: In(cardIds) },
        select: { id: true },
        relations: { book: { user: true } },
      });

      if (cards.length !== new Set(cardIds).size) {
        throw new NotFoundException('일부 card를 찾을 수 없습니다.');
      }

      const hasForeignCard = cards.some((card) => card.book.user.id !== userId);
      if (hasForeignCard) {
        throw new ForbiddenException(
          '타 유저의 card는 덱에 추가할 수 없습니다.',
        );
      }
    }
  }

  private async ensureUserExists(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('해당 유저가 존재하지 않습니다.');
    }
  }

  private async findOwnedDeck(userId: number, deckId: number) {
    const deck = await this.deckRepository.findOne({ where: { id: deckId } });
    if (!deck) {
      throw new NotFoundException('해당 덱이 존재하지 않습니다.');
    }
    if (deck.userId !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }
    return deck;
  }
}
