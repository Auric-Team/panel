import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function generateKeyString(isMasterKey: boolean = false, prefix?: string, format?: 'hyphenated' | 'raw16' | 'uuid'): string {
  if (isMasterKey) {
    return '@Axiosofficial';
  }

  if (format === 'uuid') {
    return crypto.randomUUID();
  }

  const charsUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segUpper = (len: number) =>
    Array.from({ length: len }, () => charsUpper.charAt(Math.floor(Math.random() * charsUpper.length))).join('');

  const cleanPrefix = (prefix || 'AXIOS').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefixStr = cleanPrefix ? `${cleanPrefix}-` : '';

  if (format === 'raw16') {
    return `${prefixStr}${segUpper(16)}`;
  }

  return `${prefixStr}${segUpper(4)}-${segUpper(4)}-${segUpper(4)}`;
}

export function saveBase64Image(base64DataStr: string): string | null {
  if (!base64DataStr || typeof base64DataStr !== 'string') return null;
  if (!base64DataStr.startsWith('data:image/')) return base64DataStr;

  try {
    const matches = base64DataStr.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64DataStr;

    let ext = matches[1].toLowerCase();
    if (ext === 'jpeg' || ext === 'jpg') ext = 'jpg';
    else if (ext === 'png') ext = 'png';
    else if (ext === 'webp') ext = 'webp';
    else ext = 'jpg';

    const rawData = matches[2];
    const fileName = `screenshot-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const buffer = Buffer.from(rawData, 'base64');

    const targetDirs = [
      ENV.UPLOADS_DIR,
      path.resolve(process.cwd(), 'uploads'),
      path.resolve(process.cwd(), 'backend', 'uploads'),
      path.resolve(process.cwd(), 'backup_db', 'uploads'),
      path.resolve(__dirname, '..', '..', 'uploads'),
      path.resolve(__dirname, '..', '..', 'backend', 'uploads'),
      path.resolve(__dirname, '..', '..', 'backup_db', 'uploads'),
    ];

    targetDirs.forEach((dir) => {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, fileName), buffer);
      } catch {}
    });

    return `/uploads/${fileName}`;
  } catch (error) {
    console.error('Failed to save base64 image:', error);
    return base64DataStr;
  }
}

export function verifyClientSignature(key: string, hwid: string, timestamp: number, signature: string): boolean {
  const payloadStr = `${key}${hwid}${timestamp}${ENV.API_SALT}`;
  const expectedHash = crypto.createHash('sha256').update(payloadStr).digest('hex');

  const expectedHmac = crypto
    .createHmac('sha256', ENV.PAYLOAD_SECRET)
    .update(`${key}${hwid}${timestamp}`)
    .digest('hex');

  const sigLower = signature.toLowerCase();
  return sigLower === expectedHash.toLowerCase() || sigLower === expectedHmac.toLowerCase();
}
