const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const mediaRoot = path.join(process.cwd(), "uploads", "media");
const uploadsRoot = path.resolve(process.cwd(), "uploads");
const imageDir = path.join(mediaRoot, "images");
const videoDir = path.join(mediaRoot, "videos");

const ensureMediaDirs = async () => {
  await Promise.all([
    fs.mkdir(imageDir, { recursive: true }),
    fs.mkdir(videoDir, { recursive: true }),
  ]);
};

const removeFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.log("Cannot remove temp media file:", error.message);
    }
  }
};

const getLocalUploadPath = (mediaItem) => {
  const storageKey = mediaItem?.storageKey;
  const url = typeof mediaItem === "string" ? mediaItem : mediaItem?.url;
  const relativePath = storageKey || url?.replace(/^https?:\/\/[^/]+\/uploads\//, "");

  if (!relativePath) return null;

  const normalized = relativePath
    .replace(/^\/?uploads\//, "")
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
  const absolutePath = path.resolve(uploadsRoot, normalized);
  const relativeToUploads = path.relative(uploadsRoot, absolutePath);

  return relativeToUploads && !relativeToUploads.startsWith("..") && !path.isAbsolute(relativeToUploads)
    ? absolutePath
    : null;
};

const removeStoredMediaFiles = async (media = []) => {
  await Promise.all(
    media
      .map(getLocalUploadPath)
      .filter(Boolean)
      .map((filePath) => removeFile(filePath)),
  );
};

const buildPublicUrl = (relativeUrl) => {
  const baseUrl = (process.env.MEDIA_BASE_URL || "").replace(/\/$/, "");
  return baseUrl ? `${baseUrl}${relativeUrl}` : relativeUrl;
};

const getMediaKind = (mimetype = "") => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "file";
};

const processImage = async (file, userId) => {
  const outputName = `image-${userId}-${Date.now()}-${Math.round(
    Math.random() * 1e9,
  )}.webp`;
  const outputPath = path.join(imageDir, outputName);

  const image = sharp(file.path).rotate();
  const metadata = await image.metadata();

  await image
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(outputPath);

  const processedStats = await fs.stat(outputPath);
  await removeFile(file.path);

  const relativeUrl = `/uploads/media/images/${outputName}`;
  return {
    url: buildPublicUrl(relativeUrl),
    storageKey: `media/images/${outputName}`,
    type: "image",
    originalName: file.originalname,
    mimeType: "image/webp",
    size: processedStats.size,
    originalSize: file.size,
    width: metadata.width || null,
    height: metadata.height || null,
    storageProvider: process.env.MEDIA_STORAGE_PROVIDER || "local",
  };
};

const processVideo = async (file, userId) => {
  const ext = path.extname(file.originalname) || path.extname(file.path);
  const outputName = `video-${userId}-${Date.now()}-${Math.round(
    Math.random() * 1e9,
  )}${ext}`;
  const outputPath = path.join(videoDir, outputName);

  await fs.rename(file.path, outputPath);

  const relativeUrl = `/uploads/media/videos/${outputName}`;
  return {
    url: buildPublicUrl(relativeUrl),
    storageKey: `media/videos/${outputName}`,
    type: "video",
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    originalSize: file.size,
    width: null,
    height: null,
    storageProvider: process.env.MEDIA_STORAGE_PROVIDER || "local",
  };
};

const processPostMediaFiles = async (files = [], userId) => {
  await ensureMediaDirs();

  const processed = [];
  for (const file of files) {
    const kind = getMediaKind(file.mimetype);
    if (kind === "image") {
      processed.push(await processImage(file, userId));
    } else if (kind === "video") {
      processed.push(await processVideo(file, userId));
    } else {
      await removeFile(file.path);
    }
  }

  return processed;
};

module.exports = {
  processPostMediaFiles,
  removeStoredMediaFiles,
};
