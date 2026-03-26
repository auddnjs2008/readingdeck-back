import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CardType } from 'src/card/entity/card.entity';
import { S3Service } from 'src/common/service/s3.service';
import { DeckConnection } from 'src/deck-connection/entity/deck-connection.entity';
import { DeckNode } from 'src/deck-node/entity/deck-node.entity';
import { Deck, DeckStatus } from 'src/deck/entity/deck.entity';
import { User } from 'src/user/entity/user.entity';
import { Repository } from 'typeorm';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { CreateCommunityCommentDto } from './dto/create-community-comment.dto';
import { CommunityCommentItemResponseDto } from './dto/get-community-comments-response.dto';
import { GetCommunityPostsQueryDto } from './dto/get-community-posts-query.dto';
import { CommunityComment } from './entity/community-comment.entity';
import {
  CommunityPostDetailResponseDto,
  GetCommunityPostsResponseDto,
} from './dto/get-community-posts-response.dto';
import {
  CommunityPost,
  CommunityPostSnapshot,
  CommunityPostSnapshotNode,
} from './entity/community-post.entity';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(CommunityComment)
    private readonly communityCommentRepository: Repository<CommunityComment>,
    @InjectRepository(CommunityPost)
    private readonly communityPostRepository: Repository<CommunityPost>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(DeckNode)
    private readonly deckNodeRepository: Repository<DeckNode>,
    @InjectRepository(DeckConnection)
    private readonly deckConnectionRepository: Repository<DeckConnection>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly s3Service: S3Service,
  ) {}

  async getCommunityPosts(
    dto: GetCommunityPostsQueryDto,
  ): Promise<GetCommunityPostsResponseDto> {
    const take = Math.min(dto.take ?? 12, 30);
    const offset = dto.cursor ?? 0;
    const sortType: 'ASC' | 'DESC' = dto.sort === 'oldest' ? 'ASC' : 'DESC';

    const qb = this.communityPostRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user');

    if (dto.mode) {
      qb.andWhere('post.deckMode = :mode', { mode: dto.mode });
    }

    if (dto.type) {
      qb.andWhere('post.primaryCardType = :type', { type: dto.type });
    }

    const total = await qb.clone().getCount();
    const items = await qb
      .orderBy('post.createdAt', sortType)
      .addOrderBy('post.id', sortType)
      .take(take)
      .skip(offset)
      .getMany();

    return {
      items: items.map((item) => this.mapCommunityPost(item)),
      meta: {
        total,
        take,
        cursor: offset,
        nextCursor:
          offset + items.length < total ? offset + items.length : null,
      },
    };
  }

  async getCommunityPost(
    postId: number,
  ): Promise<CommunityPostDetailResponseDto> {
    const item = await this.communityPostRepository.findOne({
      where: { id: postId },
      relations: { user: true },
    });

    if (!item) {
      throw new NotFoundException('공유된 덱을 찾을 수 없습니다.');
    }

    return {
      ...this.mapCommunityPost(item),
      snapshot: item.snapshot,
    };
  }

  async createCommunityPost(userId: number, dto: CreateCommunityPostDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const deck = await this.deckRepository.findOne({
      where: { id: dto.deckId, userId },
    });

    if (!deck) {
      throw new NotFoundException('덱을 찾을 수 없습니다.');
    }

    if (deck.status !== DeckStatus.PUBLISHED) {
      throw new BadRequestException(
        '발행된 덱만 커뮤니티에 공유할 수 있습니다.',
      );
    }

    const [nodes, connections] = await Promise.all([
      this.deckNodeRepository.find({
        where: { deckId: deck.id },
        relations: {
          book: true,
          card: {
            book: true,
          },
        },
        order: { order: 'ASC', id: 'ASC' },
      }),
      this.deckConnectionRepository.find({
        where: { deckId: deck.id },
        order: { id: 'ASC' },
      }),
    ]);

    if (nodes.length < 1 || !deck.preview) {
      throw new BadRequestException(
        '공유하려면 미리보기 가능한 덱이어야 합니다.',
      );
    }

    const snapshotNodes: CommunityPostSnapshotNode[] = nodes.map((node) => {
      const relatedBook = node.book ?? node.card?.book ?? null;
      return {
        id: node.id,
        type: node.type,
        positionX: node.positionX,
        positionY: node.positionY,
        order: node.order,
        book: relatedBook
          ? {
              id: relatedBook.id,
              title: relatedBook.title,
              author: relatedBook.author,
              publisher: relatedBook.publisher,
              backgroundImage: this.s3Service.resolvePublicUrl(
                relatedBook.backgroundImage,
              ),
            }
          : null,
        card: node.card
          ? {
              id: node.card.id,
              type: node.card.type,
              quote: node.card.quote ?? null,
              thought: node.card.thought,
              backgroundImage: this.s3Service.resolvePublicUrl(
                node.card.backgroundImage,
              ),
              pageStart: node.card.pageStart ?? null,
              pageEnd: node.card.pageEnd ?? null,
            }
          : null,
      };
    });

    const snapshot: CommunityPostSnapshot = {
      version: 1,
      deck: {
        id: deck.id,
        name: deck.name,
        description: deck.description ?? null,
        mode: deck.mode,
      },
      nodes: snapshotNodes,
      connections: connections.map((item) => ({
        id: item.id,
        fromNodeId: item.fromNodeId,
        toNodeId: item.toNodeId,
        type: item.type ?? null,
        style: item.style ?? null,
        animated: item.animated,
        markerEnd: item.markerEnd ?? null,
        sourceHandle: item.sourceHandle ?? null,
        targetHandle: item.targetHandle ?? null,
        label: item.label ?? null,
      })),
    };

    const primaryNode =
      snapshotNodes.find((node) => node.card?.quote?.trim()) ??
      snapshotNodes.find((node) => node.card) ??
      snapshotNodes.find((node) => node.book) ??
      null;

    if (!primaryNode?.card?.thought && !primaryNode?.book?.title) {
      throw new BadRequestException('공유용 대표 콘텐츠를 찾을 수 없습니다.');
    }

    const saved = await this.communityPostRepository.save({
      id: (
        await this.communityPostRepository.findOne({
          where: { deckId: deck.id },
          select: { id: true },
        })
      )?.id,
      userId,
      deckId: deck.id,
      caption: dto.caption?.trim() ? dto.caption.trim() : null,
      deckName: deck.name,
      deckDescription: deck.description ?? null,
      deckMode: deck.mode,
      preview: deck.preview,
      snapshot,
      primaryCardType: primaryNode.card?.type ?? null,
      primaryQuote: primaryNode.card?.quote ?? null,
      primaryThought:
        primaryNode.card?.thought ?? primaryNode.book?.title ?? deck.name,
      bookTitle: primaryNode.book?.title ?? null,
      bookAuthor: primaryNode.book?.author ?? null,
      user,
      deck,
    });

    const post = await this.communityPostRepository.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });

    if (!post) {
      throw new NotFoundException('공유 결과를 불러오지 못했습니다.');
    }

    return this.mapCommunityPost(post);
  }

  async getCommunityComments(
    postId: number,
  ): Promise<CommunityCommentItemResponseDto[]> {
    await this.ensureCommunityPostExists(postId);

    const comments = await this.communityCommentRepository.find({
      where: { postId },
      relations: { user: true },
      withDeleted: true,
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    const items = comments.map((comment) => this.mapCommunityComment(comment));
    const repliesByParentId = new Map<
      number,
      CommunityCommentItemResponseDto[]
    >();
    const roots: CommunityCommentItemResponseDto[] = [];

    items.forEach((item) => {
      if (item.parentId == null) {
        roots.push(item);
        return;
      }

      const existing = repliesByParentId.get(item.parentId) ?? [];
      existing.push(item);
      repliesByParentId.set(item.parentId, existing);
    });

    roots.forEach((item) => {
      item.replies = repliesByParentId.get(item.id) ?? [];
    });

    return roots.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async createCommunityComment(
    userId: number,
    postId: number,
    dto: CreateCommunityCommentDto,
  ) {
    const [user, post] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId } }),
      this.communityPostRepository.findOne({ where: { id: postId } }),
    ]);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (!post) {
      throw new NotFoundException('공유된 덱을 찾을 수 없습니다.');
    }

    let parent: CommunityComment | null = null;
    if (dto.parentId) {
      parent = await this.communityCommentRepository.findOne({
        where: { id: dto.parentId, postId },
        withDeleted: true,
      });

      if (!parent) {
        throw new NotFoundException('답글 대상 댓글을 찾을 수 없습니다.');
      }

      if (parent.parentId !== null) {
        throw new BadRequestException(
          '답글은 한 단계까지만 작성할 수 있습니다.',
        );
      }
    }

    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('댓글 내용을 입력해 주세요.');
    }

    const saved = await this.communityCommentRepository.save(
      this.communityCommentRepository.create({
        postId,
        userId,
        parentId: parent?.id ?? null,
        content,
      }),
    );

    const comment = await this.communityCommentRepository.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });

    if (!comment) {
      throw new NotFoundException('작성한 댓글을 불러오지 못했습니다.');
    }

    return this.mapCommunityComment(comment);
  }

  async deleteCommunityComment(userId: number, commentId: number) {
    const comment = await this.communityCommentRepository.findOne({
      where: { id: commentId },
      withDeleted: true,
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('본인 댓글만 삭제할 수 있습니다.');
    }

    comment.content = '';
    await this.communityCommentRepository.softRemove(comment);
  }

  private async ensureCommunityPostExists(postId: number) {
    const post = await this.communityPostRepository.findOne({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('공유된 덱을 찾을 수 없습니다.');
    }
  }

  private mapCommunityPost(item: CommunityPost) {
    return {
      id: item.id,
      deckId: item.deckId,
      caption: item.caption,
      deckName: item.deckName,
      deckDescription: item.deckDescription,
      deckMode: item.deckMode,
      preview: item.preview,
      primaryCardType: item.primaryCardType as CardType | null,
      primaryQuote: item.primaryQuote,
      primaryThought: item.primaryThought,
      bookTitle: item.bookTitle,
      bookAuthor: item.bookAuthor,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      author: {
        id: item.user.id,
        name: item.user.name,
        profile: item.user.profile ?? null,
      },
    };
  }

  private mapCommunityComment(
    item: CommunityComment,
  ): CommunityCommentItemResponseDto {
    const isDeleted = Boolean(item.deletedAt);

    return {
      id: item.id,
      postId: item.postId,
      userId: item.userId,
      parentId: item.parentId ?? null,
      content: isDeleted ? null : item.content,
      isDeleted,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      author:
        isDeleted || !item.user
          ? null
          : {
              id: item.user.id,
              name: item.user.name,
              profile: item.user.profile ?? null,
            },
      replies: [],
    };
  }
}
