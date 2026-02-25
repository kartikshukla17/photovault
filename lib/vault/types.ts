export type VaultPhoto = {
  id: string;
  thumbUrl: string;
  previewUrl: string;
  originalUrl?: string;
  filename: string;
  sizeBytes: number;
  takenAt: Date;
  device: string;
  location: string;
  width: number;
  height: number;
  backedUp: boolean;
  processingStatus: string;
};

export type VaultAlbum = {
  id: string;
  name: string;
  photoIds: string[];
};
