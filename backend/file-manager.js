const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const PDF_MIME_TYPE = "application/pdf";

function deepClone(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeRoomId(roomId) {
  return String(roomId || "")
    .trim()
    .toUpperCase();
}

function ensureArrayMap(map, key) {
  if (!map.has(key)) {
    map.set(key, []);
  }
  return map.get(key);
}

function sanitizeName(name = "") {
  return String(name)
    .replace(/[\\/\r\n\t]/g, "_")
    .trim();
}

function normalizeBaseUrl(baseUrl = "") {
  const trimmed = String(baseUrl || "").trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

class FileManager {
  constructor(options = {}) {
    this.storageRoot =
      options.storageRoot || path.join(process.cwd(), "backend", "storage");
    this.originalDir = path.join(this.storageRoot, "original");
    this.optimizedDir = path.join(this.storageRoot, "optimized");
    this.thumbnailDir = path.join(this.storageRoot, "thumbnails");
    this.metaPath = path.join(this.storageRoot, "metadata.json");

    this.publicBaseUrl = normalizeBaseUrl(options.publicBaseUrl || "");
    this.cdnBaseUrl = normalizeBaseUrl(options.cdnBaseUrl || "");

    this.files = new Map();
    this.filesByRoom = new Map();
  }

  async init() {
    await Promise.all([
      fsp.mkdir(this.storageRoot, { recursive: true }),
      fsp.mkdir(this.originalDir, { recursive: true }),
      fsp.mkdir(this.optimizedDir, { recursive: true }),
      fsp.mkdir(this.thumbnailDir, { recursive: true })
    ]);

    if (!fs.existsSync(this.metaPath)) {
      await fsp.writeFile(this.metaPath, JSON.stringify({ files: [] }, null, 2));
      return;
    }

    const raw = await fsp.readFile(this.metaPath, "utf8");
    if (!raw) return;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      parsed = { files: [] };
    }

    const fileList = Array.isArray(parsed.files) ? parsed.files : [];
    fileList.forEach((metadata) => {
      if (!metadata || !metadata.id) return;
      this.files.set(metadata.id, metadata);
      const roomId = normalizeRoomId(metadata.roomId);
      if (!roomId) return;
      ensureArrayMap(this.filesByRoom, roomId).push(metadata.id);
    });

    this.filesByRoom.forEach((ids) => {
      ids.sort((a, b) => {
        const first = this.files.get(a);
        const second = this.files.get(b);
        return Number(second?.createdAt || 0) - Number(first?.createdAt || 0);
      });
    });
  }

  buildPublicUrl(routePath) {
    const base = this.cdnBaseUrl || this.publicBaseUrl;
    if (!base) return routePath;
    return `${base}${routePath}`;
  }

  isSupportedMimeType(mimeType = "") {
    return IMAGE_MIME_TYPES.has(mimeType) || mimeType === PDF_MIME_TYPE;
  }

  detectFileType(mimeType = "") {
    if (IMAGE_MIME_TYPES.has(mimeType)) return "image";
    if (mimeType === PDF_MIME_TYPE) return "pdf";
    return "unknown";
  }

  extensionForMime(mimeType = "") {
    if (mimeType === "image/png") return ".png";
    if (mimeType === "image/jpeg") return ".jpg";
    if (mimeType === PDF_MIME_TYPE) return ".pdf";
    return "";
  }

  generateFileId() {
    return `file_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
  }

  async persist() {
    const payload = {
      files: Array.from(this.files.values())
    };

    await fsp.writeFile(this.metaPath, JSON.stringify(payload, null, 2));
  }

  getFile(fileId) {
    const metadata = this.files.get(String(fileId || ""));
    return metadata ? deepClone(metadata) : null;
  }

  listRoomFiles(roomId) {
    const normalizedRoomId = normalizeRoomId(roomId);
    if (!normalizedRoomId) return [];

    const ids = this.filesByRoom.get(normalizedRoomId) || [];
    return ids
      .map((id) => this.files.get(id))
      .filter(Boolean)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .map((metadata) => deepClone(metadata));
  }

  async saveUpload({
    roomId,
    uploaderId,
    uploaderName,
    tempPath,
    originalName,
    mimeType,
    size
  }) {
    const normalizedRoomId = normalizeRoomId(roomId);
    if (!normalizedRoomId) {
      throw new Error("roomId is required");
    }

    if (!this.isSupportedMimeType(mimeType)) {
      throw new Error("Unsupported file type");
    }

    const fileId = this.generateFileId();
    const now = Date.now();
    const type = this.detectFileType(mimeType);
    const extension = this.extensionForMime(mimeType);

    const originalDiskName = `${fileId}${extension}`;
    const originalPath = path.join(this.originalDir, originalDiskName);
    await fsp.rename(tempPath, originalPath);

    let optimizedDiskName = null;
    let thumbnailDiskName = null;
    let dimensions = null;

    if (type === "image") {
      optimizedDiskName = `${fileId}-optimized.webp`;
      thumbnailDiskName = `${fileId}-thumb.webp`;

      const optimizedPath = path.join(this.optimizedDir, optimizedDiskName);
      const thumbnailPath = path.join(this.thumbnailDir, thumbnailDiskName);

      const metadata = await sharp(originalPath).metadata();
      dimensions = {
        width: metadata.width || null,
        height: metadata.height || null
      };

      await sharp(originalPath)
        .rotate()
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 84 })
        .toFile(optimizedPath);

      await sharp(originalPath)
        .rotate()
        .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(thumbnailPath);
    }

    const metadata = {
      id: fileId,
      roomId: normalizedRoomId,
      originalName: sanitizeName(originalName),
      mimeType,
      type,
      size: Number(size || 0),
      uploaderId: String(uploaderId || "unknown"),
      uploaderName: sanitizeName(uploaderName || "用户") || "用户",
      createdAt: now,
      dimensions,
      storage: {
        originalDiskName,
        optimizedDiskName,
        thumbnailDiskName
      },
      urls: {
        content: this.buildPublicUrl(`/api/files/${fileId}/content`),
        optimized: optimizedDiskName
          ? this.buildPublicUrl(`/api/files/${fileId}/optimized`)
          : this.buildPublicUrl(`/api/files/${fileId}/content`),
        thumbnail: thumbnailDiskName
          ? this.buildPublicUrl(`/api/files/${fileId}/thumbnail`)
          : null
      },
      objectId: null,
      deletedAt: null
    };

    this.files.set(fileId, metadata);
    ensureArrayMap(this.filesByRoom, normalizedRoomId).unshift(fileId);

    await this.persist();
    return deepClone(metadata);
  }

  async linkObject(fileId, objectId) {
    const metadata = this.files.get(String(fileId || ""));
    if (!metadata) return null;

    metadata.objectId = objectId || null;
    this.files.set(metadata.id, metadata);
    await this.persist();
    return deepClone(metadata);
  }

  canDelete(fileId, requesterId, roomOwnerId = null) {
    const metadata = this.files.get(String(fileId || ""));
    if (!metadata) return false;

    const actorId = String(requesterId || "");
    if (!actorId) return false;

    if (actorId === String(metadata.uploaderId || "")) return true;
    if (roomOwnerId && actorId === String(roomOwnerId)) return true;
    return false;
  }

  async deleteFile(fileId) {
    const metadata = this.files.get(String(fileId || ""));
    if (!metadata) return null;

    const deleteTargets = [
      metadata.storage?.originalDiskName
        ? path.join(this.originalDir, metadata.storage.originalDiskName)
        : null,
      metadata.storage?.optimizedDiskName
        ? path.join(this.optimizedDir, metadata.storage.optimizedDiskName)
        : null,
      metadata.storage?.thumbnailDiskName
        ? path.join(this.thumbnailDir, metadata.storage.thumbnailDiskName)
        : null
    ].filter(Boolean);

    await Promise.all(
      deleteTargets.map(async (targetPath) => {
        try {
          await fsp.unlink(targetPath);
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw error;
          }
        }
      })
    );

    this.files.delete(metadata.id);

    const normalizedRoomId = normalizeRoomId(metadata.roomId);
    if (this.filesByRoom.has(normalizedRoomId)) {
      const next = this.filesByRoom
        .get(normalizedRoomId)
        .filter((candidateId) => candidateId !== metadata.id);

      if (next.length) {
        this.filesByRoom.set(normalizedRoomId, next);
      } else {
        this.filesByRoom.delete(normalizedRoomId);
      }
    }

    await this.persist();
    return deepClone(metadata);
  }

  getVariantPath(fileId, variant = "content") {
    const metadata = this.files.get(String(fileId || ""));
    if (!metadata) return null;

    if (variant === "thumbnail" && metadata.storage?.thumbnailDiskName) {
      return {
        path: path.join(this.thumbnailDir, metadata.storage.thumbnailDiskName),
        contentType: "image/webp",
        metadata
      };
    }

    if (variant === "optimized" && metadata.storage?.optimizedDiskName) {
      return {
        path: path.join(this.optimizedDir, metadata.storage.optimizedDiskName),
        contentType: "image/webp",
        metadata
      };
    }

    return {
      path: path.join(this.originalDir, metadata.storage.originalDiskName),
      contentType: metadata.mimeType,
      metadata
    };
  }

  getStats() {
    return {
      files: this.files.size,
      rooms: this.filesByRoom.size
    };
  }
}

module.exports = FileManager;
