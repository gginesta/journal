import sharp from "sharp";

export type GeneratedThumbnail = {
  buffer: Buffer;
  contentType: "image/jpeg";
  extension: "jpg";
};

export async function makePhotoThumbnail(buffer: Buffer): Promise<GeneratedThumbnail> {
  const thumbnail = await sharp(buffer, { failOn: "warning" })
    .rotate()
    .resize({
      width: 420,
      height: 420,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({
      quality: 72,
      mozjpeg: true
    })
    .toBuffer();

  return {
    buffer: thumbnail,
    contentType: "image/jpeg",
    extension: "jpg"
  };
}
