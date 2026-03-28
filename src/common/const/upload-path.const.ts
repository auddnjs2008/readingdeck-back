export const UploadAssetType = {
  PROFILE_AVATAR: 'profile-avatar',
  BOOK_COVER_UPLOAD: 'book-cover-upload',
} as const;

export type UploadAssetType =
  (typeof UploadAssetType)[keyof typeof UploadAssetType];

export type UploadAssetContext = {
  type: UploadAssetType;
  userId?: number;
  provider?: string;
  externalId?: string;
};
