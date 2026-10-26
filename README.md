# PhotoVault (UI Prototype)

This Next.js app implements the **Photo Vault** UI described in:
- `personal-photo-vault.md`
- `photo-vault-figma-spec.md`
- `photo-vault-ui.jsx` (prototype reference)

## Run

```bash
npm run dev
```

## Screens

- `/gallery`
- `/albums`
- `/backup`
- `/settings`

## Notes

- Mock photos/albums live in `lib/vault/mock-data.ts`.
- `npm run build` uses `next build --webpack` (to avoid Turbopack sandbox issues in this environment).

## Troubleshooting

### CloudFront `502 Bad Gateway` for thumbs/preview

If the UI can list photos but thumbnails/preview fail and the image request to CloudFront returns `502`, the problem is almost always **CloudFront → origin connectivity/config**, not your IAM user policy.

Quick checks:

- Temporarily bypass CloudFront by setting `NEXT_PUBLIC_STORAGE_CDN_MODE=presigned` (or `proxy`) and reload. If images work, the S3 objects/keys are fine and the CloudFront distribution/origin is the issue.
- In the CloudFront distribution, verify the **origin type and protocol**:
  - If your origin is an **S3 website endpoint** (`s3-website-...amazonaws.com`), the origin only supports **HTTP**. Set the origin protocol policy to **HTTP only** (using HTTPS to an S3 website endpoint commonly produces `502`).
  - If you want a private bucket with OAC/OAI, use the **S3 REST endpoint** (`bucket.s3.<region>.amazonaws.com`) with OAC/OAI (website endpoints don’t work with OAC).
- If you’re using **multiple origins** (app + S3), confirm your cache behaviors route the image paths (e.g. `users/*`) to the S3 origin, and `/api/*` to the app origin.

## Storage delivery modes

The API can return different kinds of URLs for photo blobs based on `NEXT_PUBLIC_STORAGE_CDN_MODE`:

- `presigned` (default): S3 pre-signed `GetObject` URLs (direct S3 access from the browser).
- `public`: Unsigned CDN URLs built from `NEXT_PUBLIC_STORAGE_CDN_URL`.
- `proxy`: App-hosted URLs (`/api/photos/:id/blob/:variant`) that stream from S3 server-side.
- `signed`: CloudFront **signed URLs** (keeps S3 private; browser only talks to CloudFront).

To use CloudFront signed URLs:

- Set `NEXT_PUBLIC_STORAGE_CDN_MODE=signed`
- Set `NEXT_PUBLIC_STORAGE_CDN_URL` to your CloudFront distribution base URL (e.g. `https://d123.cloudfront.net`)
- Set server env vars:
  - `CLOUDFRONT_KEY_PAIR_ID`
  - `CLOUDFRONT_PRIVATE_KEY` (PEM; `\n`-escaped is OK)
