import { DeckPreview, DeckStatus } from '../entity/deck.entity';

export class DeckListItemResponseDto {
  id: number;
  name: string;
  status: DeckStatus;
  createdAt: Date;
  updatedAt: Date;
  preview: DeckPreview | null;
  previewUpdatedAt: Date | null;
  nodeCount: number;
  connectionCount: number;
}

export class GetDecksMetaResponseDto {
  total: number;
  take: number;
  cursor: number;
  nextCursor: number | null;
}

export class GetDecksResponseDto {
  items: DeckListItemResponseDto[];
  meta: GetDecksMetaResponseDto;
}
