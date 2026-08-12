import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';
import { db } from '../db/database';
import { LogsService } from '../services/logs.service';
import { AuthenticatedRequest } from '../types/common';

const getLibil2cppPath = () => path.join(ENV.UPLOADS_DIR, 'libil2cpp.so');

export interface PayloadMetaRecord {
  id: number;
  version: string;
  versionCode: number;
  changelog: string | null;
  size: number;
  updatedAt: string;
  updatedBy: string | null;
}

export const getDeployStatus = (req: Request, res: Response) => {
  const binaryPath = getLibil2cppPath();
  const exists = fs.existsSync(binaryPath);
  let size = 0;
  let fileMtime: string | null = null;

  if (exists) {
    try {
      const stats = fs.statSync(binaryPath);
      size = stats.size;
      fileMtime = stats.mtime.toISOString();
    } catch (_) {}
  }

  let meta = db.prepare('SELECT * FROM payload_meta WHERE id = 1').get() as PayloadMetaRecord | undefined;

  if (!meta) {
    meta = {
      id: 1,
      version: '1.0.0',
      versionCode: 100,
      changelog: 'Latest release build',
      size,
      updatedAt: fileMtime || new Date().toISOString(),
      updatedBy: 'System',
    };
  }

  res.json({
    status: 'online',
    message: 'AXIOS Integrated Backend Server Active',
    binaryExists: exists,
    binarySize: exists ? size : meta.size,
    version: meta.version || '1.0.0',
    versionCode: meta.versionCode || 100,
    changelog: meta.changelog || 'Performance & anti-cheat engine improvements.',
    updatedAt: meta.updatedAt || fileMtime || new Date().toISOString(),
    updatedBy: meta.updatedBy || 'Manager/Owner',
    timestamp: new Date().toISOString(),
  });
};

export const downloadBinary = (req: Request, res: Response) => {
  const binaryPath = getLibil2cppPath();

  if (!fs.existsSync(binaryPath)) {
    return res.status(404).json({
      success: false,
      error: 'libil2cpp.so binary has not been uploaded yet on the server.',
    });
  }

  res.setHeader('Content-Disposition', 'attachment; filename=libil2cpp.so');
  res.setHeader('Content-Type', 'application/octet-stream');

  const fileStream = fs.createReadStream(binaryPath);
  fileStream.pipe(res);
};

export const uploadBinary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'owner' && userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Permission Denied: Only Managers and Owner can publish a new libil2cpp.so binary.',
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No libil2cpp.so file uploaded.' });
    }

    const inputVersion = (req.body.version || '').trim();
    if (!inputVersion) {
      return res.status(400).json({
        success: false,
        error: 'A version string (e.g., 1.0.1 or v2.0) is required when publishing a new libil2cpp.so.',
      });
    }

    const inputChangelog = (req.body.changelog || 'Published new libil2cpp.so release build.').trim();
    const parsedVersionCode = parseInt(req.body.versionCode, 10) || Math.floor(Date.now() / 1000);

    if (!fs.existsSync(ENV.UPLOADS_DIR)) {
      fs.mkdirSync(ENV.UPLOADS_DIR, { recursive: true });
    }

    const binaryPath = getLibil2cppPath();
    const uploadedFile = req.file;

    // Replace existing file
    if (uploadedFile.path !== binaryPath) {
      if (fs.existsSync(binaryPath)) {
        try {
          fs.unlinkSync(binaryPath);
        } catch (_) {}
      }
      fs.renameSync(uploadedFile.path, binaryPath);
    }

    const stats = fs.statSync(binaryPath);
    const nowIso = new Date().toISOString();
    const username = req.user?.username || 'Admin';
    const userId = req.user?.id || 'system';

    db.prepare(`
      INSERT INTO payload_meta (id, version, versionCode, changelog, size, updatedAt, updatedBy)
      VALUES (1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        versionCode = excluded.versionCode,
        changelog = excluded.changelog,
        size = excluded.size,
        updatedAt = excluded.updatedAt,
        updatedBy = excluded.updatedBy
    `).run(inputVersion, parsedVersionCode, inputChangelog, stats.size, nowIso, username);

    LogsService.logAction(
      userId,
      username,
      'PAYLOAD_PUBLISHED',
      `Published libil2cpp.so binary version ${inputVersion} (Code: ${parsedVersionCode}, Size: ${stats.size} bytes). Notes: "${inputChangelog}"`,
      { version: inputVersion, versionCode: parsedVersionCode, size: stats.size, changelog: inputChangelog }
    );

    return res.json({
      success: true,
      message: `libil2cpp.so binary version ${inputVersion} published successfully!`,
      version: inputVersion,
      versionCode: parsedVersionCode,
      changelog: inputChangelog,
      size: stats.size,
      updatedAt: nowIso,
      updatedBy: username,
    });
  } catch (err) {
    next(err);
  }
};
