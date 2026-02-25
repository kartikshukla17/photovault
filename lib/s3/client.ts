import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// URL expiry times
const UPLOAD_URL_EXPIRY = 60 * 15; // 15 minutes for uploads
const DOWNLOAD_URL_EXPIRY = 60 * 15; // 15 minutes for viewing

export type S3Connection = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string | null;
};

function createS3Client(conn: S3Connection) {
  return new S3Client({
    region: conn.region,
    endpoint: conn.endpoint ?? undefined,
    credentials: {
      accessKeyId: conn.accessKeyId,
      secretAccessKey: conn.secretAccessKey,
    },
  });
}

/**
 * Generate a pre-signed URL for uploading a file to S3
 */
export async function getUploadUrl(
  conn: S3Connection,
  key: string,
  contentType: string,
  storageClass?: string,
): Promise<string> {
  const s3Client = createS3Client(conn);
  const params: Parameters<typeof PutObjectCommand>[0] = {
    Bucket: conn.bucket,
    Key: key,
    ContentType: contentType,
  };
  if (storageClass) {
    params.StorageClass = storageClass;
  }

  const command = new PutObjectCommand(params);

  return getSignedUrl(s3Client, command, { expiresIn: UPLOAD_URL_EXPIRY });
}

/**
 * Generate a pre-signed URL for viewing/downloading a file from S3
 */
export async function getDownloadUrl(conn: S3Connection, key: string): Promise<string> {
  const s3Client = createS3Client(conn);
  const command = new GetObjectCommand({
    Bucket: conn.bucket,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: DOWNLOAD_URL_EXPIRY });
}

/**
 * Delete an object from S3
 */
export async function deleteObject(conn: S3Connection, key: string): Promise<void> {
  const s3Client = createS3Client(conn);
  const command = new DeleteObjectCommand({
    Bucket: conn.bucket,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Delete multiple objects from S3 (original, preview, thumb)
 */
export async function deletePhotoObjects(
  conn: S3Connection,
  originalKey: string,
  previewKey: string,
  thumbKey: string
): Promise<void> {
  await Promise.all([
    deleteObject(conn, originalKey),
    deleteObject(conn, previewKey),
    deleteObject(conn, thumbKey),
  ]);
}

/**
 * Generate S3 keys for a new photo upload
 */
export function generatePhotoKeys(userId: string, photoId: string, filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const basePath = `users/${userId}/photos/${photoId}`;

  return {
    original: `${basePath}/original.${ext}`,
    preview: `${basePath}/preview.webp`,
    thumb: `${basePath}/thumb.webp`,
  };
}
