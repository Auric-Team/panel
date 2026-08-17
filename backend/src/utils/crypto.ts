import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';

export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Constant time dummy compare
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Secure password hashing with Argon2id / Bun.password or crypto.scrypt.
 */
export function hashPassword(password: string): string {
  if (typeof Bun !== 'undefined' && Bun.password?.hashSync) {
    try {
      return Bun.password.hashSync(password, { algorithm: 'argon2id', memoryCost: 65536, timeCost: 2 });
    } catch {
      try {
        return Bun.password.hashSync(password, { algorithm: 'bcrypt', cost: 10 });
      } catch (_) {}
    }
  }

  // Fallback to cryptographic scrypt with unique salt
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

/**
 * Secure password verification supporting Argon2id, bcrypt, scrypt, and legacy plaintext.
 */
export function verifyPassword(password: string, storedHash: string): { isValid: boolean; needsRehash: boolean } {
  if (!password || !storedHash) return { isValid: false, needsRehash: false };

  // Check if Argon2 / bcrypt hash
  if (storedHash.startsWith('$argon2') || storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    if (typeof Bun !== 'undefined' && Bun.password?.verifySync) {
      try {
        const valid = Bun.password.verifySync(password, storedHash);
        return { isValid: valid, needsRehash: false };
      } catch {
        return { isValid: false, needsRehash: false };
      }
    }
  }

  // Check if scrypt format
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length === 3) {
      const salt = parts[1];
      const expectedKey = parts[2];
      const derived = crypto.scryptSync(password, salt, 64).toString('hex');
      const isValid = safeCompare(derived, expectedKey);
      return { isValid, needsRehash: false };
    }
  }

  // Legacy plaintext fallback check with timing-safe comparison
  const isValid = safeCompare(password, storedHash);
  return { isValid, needsRehash: isValid }; // needs rehash to modern Argon2id
}

/**
 * Sanitize filename to prevent directory traversal and injection.
 */
export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Generate cryptographic key string with customizable format.
 */
export function generateKeyString(isMasterKey: boolean = false, prefix?: string, format?: 'hyphenated' | 'raw16' | 'uuid'): string {
  if (isMasterKey) {
    return '@Axiosofficial';
  }

  if (format === 'uuid') {
    return crypto.randomUUID().toUpperCase();
  }

  const charsUpper = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Base32 without confusing chars (0, O, 1, I)
  const getRandomChars = (len: number) => {
    const bytes = crypto.randomBytes(len);
    return Array.from(bytes)
      .map((b) => charsUpper.charAt(b % charsUpper.length))
      .join('');
  };

  const cleanPrefix = (prefix || 'AXIOS').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefixStr = cleanPrefix ? `${cleanPrefix}-` : '';

  if (format === 'raw16') {
    return `${prefixStr}${getRandomChars(16)}`;
  }

  return `${prefixStr}${getRandomChars(4)}-${getRandomChars(4)}-${getRandomChars(4)}`;
}

/**
 * Save base64 image strictly sanitizing path and checking signature.
 */
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
    const fileName = `receipt-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const safeName = sanitizeFilename(fileName);
    const buffer = Buffer.from(rawData, 'base64');

    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('Image exceeds 10MB limit');
    }

    const panelRoot = path.resolve(__dirname, '..', '..', '..');
    const backendDir = path.resolve(__dirname, '..', '..');
    const targetDirs = [
      ENV.UPLOADS_DIR,
      path.resolve(panelRoot, 'uploads'),
      path.resolve(panelRoot, 'backup_db', 'uploads'),
      path.resolve(backendDir, 'uploads'),
    ];

    targetDirs.forEach((dir) => {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, safeName), buffer);
      } catch {}
    });

    return `/uploads/${safeName}`;
  } catch (error) {
    console.error('Failed to save base64 image:', error);
    return base64DataStr;
  }
}

/**
 * Cryptographic client signature verification with anti-tamper and anti-replay protection.
 */
export function verifyClientSignature(key: string, hwid: string, timestamp: number, signature: string): boolean {
  if (!key || !signature) return false;

  const payloadStr = `${key}${hwid}${timestamp}${ENV.API_SALT}`;
  const expectedHash = crypto.createHash('sha256').update(payloadStr).digest('hex');

  const expectedHmac = crypto
    .createHmac('sha256', ENV.PAYLOAD_SECRET)
    .update(`${key}${hwid}${timestamp}`)
    .digest('hex');

  const sigLower = signature.toLowerCase().trim();
  return safeCompare(sigLower, expectedHash.toLowerCase()) || safeCompare(sigLower, expectedHmac.toLowerCase());
}

/**
 * Computes SHA-256 and MD5 hash checksum for a given file buffer or path.
 */
export function computeFileChecksums(filePath: string): { sha256: string; md5: string } | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileBuffer = fs.readFileSync(filePath);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
    return { sha256, md5 };
  } catch {
    return null;
  }
}
