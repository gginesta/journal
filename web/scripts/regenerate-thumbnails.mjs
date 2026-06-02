#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const apply = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "", 10) : Number.POSITIVE_INFINITY;
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const concurrency = Math.max(1, Number.parseInt(concurrencyArg?.split("=")[1] ?? "4", 10) || 4);

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function listAttachments() {
  const rows = [];
  for (let from = 0; rows.length < limit; from += 1000) {
    const to = from + 999;
    const { data, error } = await supabase
      .from("photo_attachments")
      .select("id,storage_path,thumbnail_path,created_at")
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data.slice(0, limit - rows.length));
    if (data.length < 1000) break;
  }
  return rows;
}

async function makeThumbnail(buffer) {
  return sharp(buffer, { failOn: "warning" })
    .rotate()
    .resize({
      width: 420,
      height: 420,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
}

async function regenerate(row) {
  const original = await supabase.storage.from("journal-photos").download(row.storage_path);
  if (original.error) throw original.error;

  const buffer = Buffer.from(await original.data.arrayBuffer());
  const thumbnail = await makeThumbnail(buffer);

  if (apply) {
    const uploaded = await supabase.storage.from("journal-thumbnails").upload(row.thumbnail_path, thumbnail, {
      contentType: "image/jpeg",
      upsert: true
    });
    if (uploaded.error) throw uploaded.error;
  }

  return {
    id: row.id,
    originalBytes: buffer.byteLength,
    thumbnailBytes: thumbnail.byteLength,
    savedBytes: Math.max(0, buffer.byteLength - thumbnail.byteLength)
  };
}

async function worker(rows, stats) {
  while (rows.length > 0) {
    const row = rows.shift();
    try {
      const result = await regenerate(row);
      stats.processed += 1;
      stats.originalBytes += result.originalBytes;
      stats.thumbnailBytes += result.thumbnailBytes;
      stats.savedBytes += result.savedBytes;
      if (stats.processed % 25 === 0) {
        console.log(
          JSON.stringify({
            mode: apply ? "apply" : "dry-run",
            processed: stats.processed,
            skipped: stats.skipped,
            savedBytes: stats.savedBytes
          })
        );
      }
    } catch (error) {
      stats.skipped += 1;
      console.error(
        JSON.stringify({
          skipped: row.id,
          storagePath: row.storage_path,
          reason: error?.message ?? String(error)
        })
      );
    }
  }
}

const rows = await listAttachments();
const stats = {
  mode: apply ? "apply" : "dry-run",
  total: rows.length,
  processed: 0,
  skipped: 0,
  originalBytes: 0,
  thumbnailBytes: 0,
  savedBytes: 0
};

console.log(JSON.stringify({ mode: stats.mode, total: stats.total, concurrency }));
await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, () => worker(rows, stats)));
console.log(JSON.stringify(stats));
