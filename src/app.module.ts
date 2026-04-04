import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { envVariableKeys } from './common/const/env.const';
import { User } from './user/entity/user.entity';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guard/jwt-auth.guard';
import { BookModule } from './book/book.module';
import { Book } from './book/entity/book.entity';
import { Card } from './card/entity/card.entity';
import { MeModule } from './me/me.module';
import { CardModule } from './card/card.module';
import { CommunityComment } from './community/entity/community-comment.entity';
import { CommunityModule } from './community/community.module';
import { CommunityPost } from './community/entity/community-post.entity';
import { Deck } from './deck/entity/deck.entity';
import { DeckNode } from './deck-node/entity/deck-node.entity';
import { DeckConnection } from './deck-connection/entity/deck-connection.entity';
import { DeckModule } from './deck/deck.module';
import { CommonModule } from './common/common.module';
import { Feedback } from './feedback/entity/feedback.entity';
import { FeedbackModule } from './feedback/feedback.module';

const getEnvFilePath = () => {
  switch (process.env.ENV) {
    case 'prod':
      return ['env/.env.prod', '.env'];
    case 'dev':
      return ['env/.env.dev', '.env'];
    default:
      return ['env/.env.local', '.env'];
  }
};

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
      validationSchema: Joi.object({
        ENV: Joi.string().valid('local', 'test', 'dev', 'prod').required(),
        DATABASE_URL: Joi.string().uri().optional(),
        ASSET_BASE_URL: Joi.string().uri().optional(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().required(),
        ACCESS_TOKEN_SECRET: Joi.string().required(),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
        FRONT_LOGIN_REDIRECT_URL: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>(
          envVariableKeys.databaseUrl,
        );
        const env = configService.get<string>(envVariableKeys.env);
        const isProduction = env === 'prod';

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          entities: [
            User,
            Book,
            Card,
            Deck,
            DeckNode,
            DeckConnection,
            CommunityPost,
            CommunityComment,
            Feedback,
          ],
          synchronize: !isProduction,
        };
      },
    }),
    AuthModule,
    BookModule,
    CardModule,
    CommunityModule,
    MeModule,
    DeckModule,
    FeedbackModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
