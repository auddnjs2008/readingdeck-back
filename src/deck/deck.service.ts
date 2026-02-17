import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from 'src/book/entity/book.entity';
import { Card } from 'src/card/entity/card.entity';
import { DeckConnection } from 'src/deck-connection/entity/deck-connection.entity';
import { DeckNode, DeckNodeType } from 'src/deck-node/entity/deck-node.entity';
import { User } from 'src/user/entity/user.entity';
import { DataSource, In, Repository } from 'typeorm';
import { CreateDeckDto } from './dto/create-deck.dto';
import { PublishDeckDto } from './dto/publish-deck.dto';
import { UpdateDeckGraphDto } from './dto/update-deck-graph.dto';
import { Deck, DeckStatus } from './entity/deck.entity';

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
    private readonly dataSource: DataSource,
  ) {}

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
          status: dto.status ?? DeckStatus.DRAFT,
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

      return {
        ...deck,
        nodes: createdNodes,
        connections: createdConnections,
      };
    });
  }

  async getDeck(userId: number, deckId: number) {
    const deck = await this.findOwnedDeck(userId, deckId);

    const [nodes, connections] = await Promise.all([
      this.deckNodeRepository.find({
        where: { deckId },
        order: { order: 'ASC', id: 'ASC' },
      }),
      this.deckConnectionRepository.find({
        where: { deckId },
        order: { id: 'ASC' },
      }),
    ]);

    return {
      ...deck,
      nodes,
      connections,
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

      const updatedDeck = await deckRepo.save({
        ...deck,
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
    deck.status = DeckStatus.PUBLISHED;

    const savedDeck = await this.deckRepository.save(deck);

    return {
      id: savedDeck.id,
      name: savedDeck.name,
      status: savedDeck.status,
      updatedAt: savedDeck.updatedAt,
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
