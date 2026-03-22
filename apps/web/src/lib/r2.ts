// ─────────────────────────────────────────────
// SuperCanvas — Cloudflare R2 Storage Client
// Upload/download helpers for backtest artifacts, ML models, etc.
// Uses AWS SDK v3 with S3-compatible API
// ─────────────────────────────────────────────

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("R2 environment variables are required");
    }

    _client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return _client;
}

const BUCKET = process.env.R2_BUCKET_NAME || "supercanvas-artifacts";

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string = "application/octet-stream"
): Promise<string> {
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${process.env.R2_PUBLIC_URL || ""}/${key}`;
}

/**
 * Get a pre-signed download URL (expires in 1 hour)
 */
export async function getDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getR2Client();

  return await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
    { expiresIn }
  );
}

/**
 * Get a pre-signed upload URL (expires in 15 minutes)
 */
export async function getUploadUrl(
  key: string,
  contentType: string = "application/octet-stream",
  expiresIn: number = 900
): Promise<string> {
  const client = getR2Client();

  return await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

/**
 * List files in R2 with a prefix
 */
export async function listR2Files(
  prefix: string,
  maxKeys: number = 100
): Promise<string[]> {
  const client = getR2Client();

  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: maxKeys,
    })
  );

  return (result.Contents || []).map((item) => item.Key!).filter(Boolean);
}

// ── Convenience helpers for specific artifact types ──

export const backtestArtifacts = {
  upload: (backtestId: string, data: Buffer) =>
    uploadToR2(
      `backtests/${backtestId}/result.msgpack`,
      data,
      "application/x-msgpack"
    ),
  getUrl: (backtestId: string) =>
    getDownloadUrl(`backtests/${backtestId}/result.msgpack`),
  delete: (backtestId: string) =>
    deleteFromR2(`backtests/${backtestId}/result.msgpack`),
};

export const mlModelArtifacts = {
  upload: (modelId: string, data: Buffer) =>
    uploadToR2(`models/${modelId}/model.onnx`, data, "application/onnx"),
  getUrl: (modelId: string) =>
    getDownloadUrl(`models/${modelId}/model.onnx`),
  delete: (modelId: string) =>
    deleteFromR2(`models/${modelId}/model.onnx`),
};
