import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
if (!REGION) {
  throw new Error("AWS_REGION must be set for the Lambda processor");
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const s3 = new S3Client({ region: REGION });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function streamToBuffer(stream) {
  if (!stream) {
    throw new Error("S3 body is empty");
  }
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export const handler = async (event) => {
  for (const record of event.Records || []) {
    if (!record?.s3) continue;
    const bucket = record.s3.bucket.name;
    const originalKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    if (!/users\/[^/]+\/photos\/[^/]+\/original\.[^/]+$/.test(originalKey)) {
      continue;
    }

    const pathParts = originalKey.split("/");
    const userId = pathParts[1];
    const photoId = pathParts[3];
    const baseFolder = `users/${userId}/photos/${photoId}`;

    try {
      const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: originalKey }));
      const inputBuffer = await streamToBuffer(Body);

      const [previewBuffer, thumbBuffer] = await Promise.all([
        sharp(inputBuffer)
          .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer(),
        sharp(inputBuffer)
          .resize({ width: 400, height: 400, fit: "cover" })
          .webp({ quality: 78 })
          .toBuffer(),
      ]);

      await Promise.all([
        s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `${baseFolder}/preview.webp`,
            Body: previewBuffer,
            ContentType: "image/webp",
          }),
        ),
        s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `${baseFolder}/thumb.webp`,
            Body: thumbBuffer,
            ContentType: "image/webp",
          }),
        ),
      ]);

      const { error } = await supabase
        .from("photos")
        .update({
          s3_key_preview: `${baseFolder}/preview.webp`,
          s3_key_thumb: `${baseFolder}/thumb.webp`,
          processing_status: "completed",
        })
        .eq("id", photoId);

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("Error processing image:", err);
      throw err;
    }
  }
  return { statusCode: 200 };
};
