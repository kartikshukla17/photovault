import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { createClient } from "@/lib/supabase/server";
import { getUserStorageConfigOrThrow } from "@/lib/storage/user-storage";
import { getObject } from "@/lib/s3/client";

type Variant = "thumb" | "preview" | "original";

function isVariant(value: string): value is Variant {
  return value === "thumb" || value === "preview" || value === "original";
}

type WebStreamTransformable = {
  transformToWebStream: () => ReadableStream<Uint8Array>;
};

function hasTransformToWebStream(value: unknown): value is WebStreamTransformable {
  return (
    typeof value === "object" &&
    value !== null &&
    "transformToWebStream" in value &&
    typeof (value as Record<string, unknown>).transformToWebStream === "function"
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; variant: string }> }
) {
  try {
    const { id, variant } = await params;
    if (!isVariant(variant)) {
      return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let storage;
    try {
      storage = await getUserStorageConfigOrThrow(supabase, user.id);
    } catch {
      return NextResponse.json({ error: "Storage not configured" }, { status: 412 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: photo, error } = await (supabase as any)
      .from("photos")
      .select("id, s3_key_thumb, s3_key_preview, s3_key_original")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const key =
      variant === "thumb"
        ? photo.s3_key_thumb
        : variant === "preview"
          ? photo.s3_key_preview
          : photo.s3_key_original;

    const expectedPrefix = `users/${user.id}/`;
    if (typeof key !== "string" || !key.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid S3 key" }, { status: 403 });
    }

    let obj;
    try {
      obj = await getObject(storage, key);
    } catch (error) {
      const maybe = error as {
        name?: string;
        message?: string;
        $metadata?: { httpStatusCode?: number };
      };
      const status = maybe?.$metadata?.httpStatusCode;
      if (status === 404 || maybe?.name === "NoSuchKey" || maybe?.name === "NotFound") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (status === 403) {
        const isProd = process.env.NODE_ENV === "production";
        const awsName = maybe?.name ?? "UnknownS3Error";
        const awsMessage = maybe?.message ?? "";
        const isSignatureIssue =
          awsName === "SignatureDoesNotMatch" ||
          awsName === "InvalidAccessKeyId" ||
          awsName === "AuthorizationHeaderMalformed";
        const isKmsLikely =
          awsName === "AccessDenied" && /kms|KMS|decrypt|Decrypt/.test(awsMessage);

        return NextResponse.json(
          {
            error:
              isSignatureIssue
                ? "S3 request was rejected (signature/credentials/region mismatch). Re-save your Storage access keys in Settings, ensure Region is correct, and leave Endpoint empty for AWS S3."
                : isKmsLikely
                  ? "S3 access denied (KMS). Your object/bucket uses SSE-KMS and the IAM principal also needs kms:Decrypt permission on the KMS key."
                  : "S3 access denied. In proxy mode, the IAM principal configured in Settings must be allowed to s3:GetObject for this key (and if SSE-KMS is enabled, also kms:Decrypt).",
            ...(isProd
              ? {}
              : {
                  details: {
                    bucket: storage.bucket,
                    key,
                    awsError: { name: awsName, message: awsMessage },
                  },
                }),
          },
          { status: 502 }
        );
      }
      throw error;
    }
    if (!obj.Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const contentType =
      obj.ContentType ??
      (variant === "original" ? "application/octet-stream" : "image/webp");

    let body: unknown = obj.Body;
    // AWS SDK streams in Node often provide transformToWebStream()
    if (hasTransformToWebStream(body)) {
      body = body.transformToWebStream();
    } else if (body instanceof Readable) {
      body = Readable.toWeb(body);
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "private, max-age=60");
    if (obj.ETag) headers.set("ETag", obj.ETag);
    if (typeof obj.ContentLength === "number") {
      headers.set("Content-Length", String(obj.ContentLength));
    }

    return new NextResponse(body as BodyInit, { status: 200, headers });
  } catch (error) {
    console.error("Error in GET /api/photos/[id]/blob/[variant]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
