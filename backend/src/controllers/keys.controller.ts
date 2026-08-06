import { Request, Response, NextFunction } from 'express';
import { db } from '../db/sqlite';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AppError } from '../utils/errors';
import { LogsService } from '../services/logs.service';
import { AuthRequest } from '../middlewares/auth';

export const verifyKey = (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqKey = req.body.key;
    const reqHwid = req.body.hwid;
    const timestamp = req.body.timestamp;
    const signature = req.body.signature || req.body.hash;

    if (!reqKey || !reqHwid) {
      return res.status(400).json({ status: 'invalid', message: 'Key and HWID are required' });
    }

    if (timestamp && signature) {
      const requestTime = typeof timestamp === 'number' ? timestamp : parseInt(timestamp, 10);
      const nowTime = Date.now();
      const timeDiff = Math.abs(nowTime - requestTime);

      if (isNaN(requestTime) || timeDiff > 10 * 60 * 1000) {
        return res.status(403).json({ status: 'invalid', message: 'Request timestamp expired' });
      }

      const salt = process.env.API_SALT || 'AXIOS_SECURE_SALT_2026';
      const payloadStr = `${reqKey}${reqHwid}${timestamp}${salt}`;
      const expectedHash = crypto.createHash('sha256').update(payloadStr).digest('hex');

      const secret = process.env.PAYLOAD_SECRET || 'AXIOS_PAYLOAD_SECRET';
      const expectedHmac = crypto.createHmac('sha256', secret).update(`${reqKey}${reqHwid}${timestamp}`).digest('hex');

      if (signature.toLowerCase() !== expectedHash.toLowerCase() && signature.toLowerCase() !== expectedHmac.toLowerCase()) {
        return res.status(403).json({ status: 'invalid', message: 'Invalid payload integrity hash' });
      }
    }

    const keyItem: any = db.prepare('SELECT * FROM keys WHERE UPPER(key) = UPPER(?)').get(reqKey.trim());

    if (!keyItem) {
      LogsService.logAction('system', 'client', 'KEY_VERIFY_FAILED', `Invalid key: ${reqKey}`);
      return res.status(404).json({ status: 'invalid', message: 'Key does not exist' });
    }

    const now = new Date();
    if (
      keyItem.status === 'expired' ||
      (keyItem.expiresAt !== 'never' && new Date(keyItem.expiresAt) < now)
    ) {
      if (keyItem.status !== 'expired') {
        db.prepare("UPDATE keys SET status = 'expired' WHERE id = ?").run(keyItem.id);
      }
      return res.status(403).json({ status: 'expired', message: 'Key has expired' });
    }

    if (keyItem.status === 'revoked' || keyItem.status === 'banned') {
      return res.status(403).json({ status: 'revoked', message: 'Key has been revoked or banned' });
    }

    if (keyItem.isMasterKey === 1 || keyItem.isMasterKey === true) {
      if (!keyItem.activatedAt) {
        db.prepare('UPDATE keys SET activatedAt = ? WHERE id = ?').run(
          now.toISOString(),
          keyItem.id
        );
      }
      LogsService.logAction('system', 'client', 'MASTER_KEY_VERIFIED', `Master key ${keyItem.key} authenticated for HWID ${reqHwid}`);
      return res.json({
        status: 'authenticated',
        message: 'Master key authenticated (Unlimited devices)',
        expiresAt: keyItem.expiresAt,
        isMasterKey: true
      });
    }

    if (!keyItem.hwid) {
      db.prepare('UPDATE keys SET hwid = ?, activatedAt = ? WHERE id = ?').run(
        reqHwid,
        now.toISOString(),
        keyItem.id
      );
      LogsService.logAction('system', 'client', 'KEY_ACTIVATED', `Key ${keyItem.key} bound to HWID ${reqHwid}`);
      return res.json({
        status: 'authenticated',
        message: 'Key successfully activated and bound to device',
        expiresAt: keyItem.expiresAt,
      });
    }

    if (keyItem.hwid === reqHwid) {
      return res.json({
        status: 'authenticated',
        message: 'Key authenticated',
        expiresAt: keyItem.expiresAt,
      });
    } else {
      LogsService.logAction('system', 'client', 'KEY_HWID_MISMATCH', `Key ${keyItem.key} HWID mismatch. Exp: ${keyItem.hwid}, Got: ${reqHwid}`);
      return res.status(403).json({ status: 'mismatch', message: 'Key is bound to another device' });
    }
  } catch (err) {
    next(err);
  }
};

export const getKeys = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, id, username } = req.user!;
    let keys: any[] = [];
    
    if (role === 'owner') {
      keys = db.prepare('SELECT * FROM keys ORDER BY createdAt DESC').all();
    } else if (role === 'manager') {
      keys = db.prepare(`
        SELECT DISTINCT k.* FROM keys k
        LEFT JOIN users u ON k.createdById = u.id
        WHERE k.createdById = ? OR k.createdByUsername = ? OR u.createdBy = ? OR u.createdBy = ?
        ORDER BY k.createdAt DESC
      `).all(id, username, id, username);
    } else {
      keys = db.prepare('SELECT * FROM keys WHERE createdById = ? OR createdByUsername = ? ORDER BY createdAt DESC').all(id, username);
    }

    return res.json(keys);
  } catch (err) {
    next(err);
  }
};

export const generateKeys = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { durationDays, count, note, isMaster, paymentScreenshot } = req.body;
    const user = req.user!;
    const numKeys = Math.max(1, parseInt(count as string) || 1);
    const days = parseInt(durationDays as string) || 0;
    const isMasterKeyFlag = isMaster === true || isMaster === 'true' || isMaster === 1;

    if (isMasterKeyFlag && user.role !== 'owner' && user.role !== 'manager') {
      return next(new AppError('Only Manager and Owner can create Master Keys.', 403));
    }

    let costPerKey = 0;
    if (isMasterKeyFlag) {
      costPerKey = 0;
    } else if (days === 0) {
      costPerKey = 300;
    } else {
      costPerKey = days * 10;
    }

    const totalCost = costPerKey * numKeys;

    if (user.role === 'reseller') {
      const userRow: any = db.prepare('SELECT COALESCE(tokens, credits, 0) as balance FROM users WHERE id = ?').get(user.id);
      const userBalance = userRow ? Number(userRow.balance || 0) : 0;

      if (userBalance < totalCost) {
        return res.status(400).json({
          success: false,
          message: `Insufficient token balance. Required: ${totalCost} tokens, Current balance: ${userBalance} tokens.`
        });
      }

      db.prepare('UPDATE users SET tokens = tokens - ?, credits = credits - ? WHERE id = ?').run(totalCost, totalCost, user.id);
    }

    let savedScreenshotUrl: string | null = null;
    if (paymentScreenshot && typeof paymentScreenshot === 'string' && paymentScreenshot.trim() !== '') {
      if (paymentScreenshot.startsWith('data:image/')) {
        try {
          const matches = paymentScreenshot.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
            const base64Data = matches[2];
            const fileName = `screenshot-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
            const uploadsFolder = path.resolve(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadsFolder)) {
              fs.mkdirSync(uploadsFolder, { recursive: true });
            }
            const filePath = path.join(uploadsFolder, fileName);
            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
            savedScreenshotUrl = `/uploads/${fileName}`;
          } else {
            savedScreenshotUrl = paymentScreenshot;
          }
        } catch (e) {
          console.error('Failed to save payment screenshot file:', e);
          savedScreenshotUrl = paymentScreenshot;
        }
      } else {
        savedScreenshotUrl = paymentScreenshot;
      }
    }

    const createdKeys: any[] = [];
    const now = new Date();

    const generateKeyString = (isMasterKey: boolean): string => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      const seg = (len: number) => Array.from({ length: len }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      if (isMasterKey) {
        return `free-key-${seg(4)}`;
      }
      const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const segUpper = (len: number) => Array.from({ length: len }, () => upperChars.charAt(Math.floor(Math.random() * upperChars.length))).join('');
      return `AXIOS-${segUpper(4)}-${segUpper(4)}-${segUpper(4)}`;
    };

    const insertStmt = db.prepare(`
      INSERT INTO keys (id, key, expiresAt, createdAt, createdById, createdByUsername, note, isMasterKey, paymentScreenshot, costTokens)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < numKeys; i++) {
      let expiresAt = 'never';
      if (days > 0) {
        expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      }
      const newKey = {
        id: crypto.randomUUID(),
        key: generateKeyString(isMasterKeyFlag),
        expiresAt,
        createdAt: now.toISOString(),
        createdById: user.id,
        createdByUsername: user.username,
        note: note || (isMasterKeyFlag ? (days === 0 ? 'Master Key (Lifetime)' : `Master Key (${days} Days)`) : (days === 0 ? 'Lifetime Key' : `${days} Days Key`)),
        isMasterKey: isMasterKeyFlag ? 1 : 0,
        paymentScreenshot: savedScreenshotUrl,
        costTokens: costPerKey
      };

      insertStmt.run(
        newKey.id,
        newKey.key,
        newKey.expiresAt,
        newKey.createdAt,
        newKey.createdById,
        newKey.createdByUsername,
        newKey.note,
        newKey.isMasterKey,
        newKey.paymentScreenshot,
        newKey.costTokens
      );
      createdKeys.push(newKey);
    }
    
    LogsService.logAction(user.id, user.username, 'KEYS_GENERATED', `Generated ${numKeys} ${isMasterKeyFlag ? 'Master ' : ''}keys (${days} days)`);

    return res.json({ success: true, count: createdKeys.length, keys: createdKeys });
  } catch (err) {
    next(err);
  }
};

export const resetHwid = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.body;
    if (!id) return next(new AppError('Key ID is required.', 400));

    db.prepare('UPDATE keys SET hwid = null WHERE id = ?').run(id);
    LogsService.logAction(req.user!.id, req.user!.username, 'KEY_HWID_RESET', `Reset HWID for key ID: ${id}`);
    return res.json({ success: true, message: 'HWID reset successfully.' });
  } catch (err) {
    next(err);
  }
};

export const deleteKey = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.body;
    if (!id) return next(new AppError('Key ID is required.', 400));

    db.prepare('DELETE FROM keys WHERE id = ?').run(id);
    LogsService.logAction(req.user!.id, req.user!.username, 'KEY_DELETED', `Deleted key ID: ${id}`);
    return res.json({ success: true, message: 'Key deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
