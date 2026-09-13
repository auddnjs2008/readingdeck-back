/// <reference types="jest" />

import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { CommunityController } from './community.controller';
import { CommunityCommentController } from './community-comment.controller';
import { CommunityService } from './community.service';
import { CommunityPost } from './entity/community-post.entity';
import { CommunityComment } from './entity/community-comment.entity';
import { Deck } from '../deck/entity/deck.entity';
import { DeckNode } from '../deck-node/entity/deck-node.entity';
import { DeckConnection } from '../deck-connection/entity/deck-connection.entity';
import { User } from '../user/entity/user.entity';
import { S3Service } from '../common/service/s3.service';

jest.mock('../common/service/s3.service', () => ({ S3Service: class {} }));

describe('community access', () => {
  const guard = new JwtAuthGuard(
    new JwtService(),
    new ConfigService(),
    new Reflector(),
  );
  const context = (controller: unknown, handler: unknown) =>
    ({
      getClass: () => controller,
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, cookies: {} }),
      }),
    }) as unknown as ExecutionContext;

  it.each([
    [CommunityController, CommunityController.prototype.getCommunityPosts],
    [CommunityController, CommunityController.prototype.getCommunityPost],
    [
      CommunityCommentController,
      CommunityCommentController.prototype.getCommunityComments,
    ],
  ])(
    'allows anonymous reads through the JWT guard (%#)',
    async (controller, handler) => {
      await expect(
        guard.canActivate(context(controller, handler)),
      ).resolves.toBe(true);
    },
  );

  it.each([
    [CommunityController, CommunityController.prototype.createCommunityPost],
    [CommunityController, CommunityController.prototype.deleteCommunityPost],
    [
      CommunityCommentController,
      CommunityCommentController.prototype.createCommunityComment,
    ],
    [
      CommunityCommentController,
      CommunityCommentController.prototype.deleteCommunityComment,
    ],
  ])(
    'rejects anonymous writes through the JWT guard (%#)',
    async (controller, handler) => {
      await expect(
        guard.canActivate(context(controller, handler)),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('rejects deletion by another user and excludes private author fields', async () => {
    const author = {
      id: 1,
      name: 'Author',
      profile: null,
      email: 'private@example.com',
      providerUserId: 'private',
    };
    const posts = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        userId: 1,
        user: author,
        snapshot: { version: 1 },
      }),
      delete: jest.fn(),
    };
    const comments = {
      findOne: jest.fn().mockResolvedValue({ id: 20, userId: 1 }),
      softRemove: jest.fn(),
      find: jest
        .fn()
        .mockResolvedValue([
          { id: 20, userId: 1, user: author, content: 'Shared' },
        ]),
    };
    const module = await Test.createTestingModule({
      providers: [
        CommunityService,
        { provide: getRepositoryToken(CommunityPost), useValue: posts },
        { provide: getRepositoryToken(CommunityComment), useValue: comments },
        ...[Deck, DeckNode, DeckConnection, User].map((entity) => ({
          provide: getRepositoryToken(entity),
          useValue: {},
        })),
        {
          provide: S3Service,
          useValue: { resolvePublicUrl: (value: string | null) => value },
        },
      ],
    }).compile();
    try {
      const service = module.get(CommunityService);
      await expect(service.deleteCommunityPost(2, 10)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.deleteCommunityComment(2, 20),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(posts.delete).not.toHaveBeenCalled();
      expect(comments.softRemove).not.toHaveBeenCalled();
      const post = await service.getCommunityPost(10);
      const [comment] = await service.getCommunityComments(10);
      expect(post.author).toEqual({ id: 1, name: 'Author', profile: null });
      expect(comment.author).toEqual(post.author);
      expect(JSON.stringify([post, comment])).not.toContain('private');
    } finally {
      await module.close();
    }
  });
});
