export class CommunityCommentAuthorResponseDto {
  id: number;
  name: string;
  profile: string | null;
}

export class CommunityCommentItemResponseDto {
  id: number;
  postId: number;
  userId: number;
  parentId: number | null;
  content: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: CommunityCommentAuthorResponseDto | null;
  replies: CommunityCommentItemResponseDto[];
}
