import { CardType } from 'src/card/entity/card.entity';
import { DeckMode, DeckPreview } from 'src/deck/entity/deck.entity';
import { CommunityPostSnapshot } from '../entity/community-post.entity';

export class CommunityPostAuthorResponseDto {
  id: number;
  name: string;
  profile: string | null;
}

export class CommunityPostListItemResponseDto {
  id: number;
  deckId: number;
  caption: string | null;
  deckName: string;
  deckDescription: string | null;
  deckMode: DeckMode;
  preview: DeckPreview;
  primaryCardType: CardType | null;
  primaryQuote: string | null;
  primaryThought: string;
  bookTitle: string | null;
  bookAuthor: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: CommunityPostAuthorResponseDto;
}

export class GetCommunityPostsMetaResponseDto {
  total: number;
  take: number;
  cursor: number;
  nextCursor: number | null;
}

export class GetCommunityPostsResponseDto {
  items: CommunityPostListItemResponseDto[];
  meta: GetCommunityPostsMetaResponseDto;
}

export class CommunityPostDetailResponseDto extends CommunityPostListItemResponseDto {
  snapshot: CommunityPostSnapshot;
}
