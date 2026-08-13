import { db } from '../db/database';
import { AppError } from '../utils/errors';
import { generateUUID, generateKeyString, saveBase64Image, verifyClientSignature } from '../utils/crypto';
import { LogsService } from './logs.service';
import { KeyRecord, VerifyKeyPayload, GenerateKeysPayload } from '../types/keys';
import { AuthUserPayload } from '../types/common';

export class KeysService {
  static verifyKey(payload: VerifyKeyPayload) {
    const { key, hwid, deviceFingerprint, timestamp, signature, hash, isInstaller } = payload;
    const reqKey = key?.trim();
    const reqHwid = (hwid || deviceFingerprint || '').trim();
    const sig = signature || hash;

    if (!reqKey) {
      throw new AppError('Activation key is required', 400);
    }

    if (timestamp && sig) {
      const requestTime = typeof timestamp === 'number' ? timestamp : parseInt(timestamp, 10);
      const timeDiff = Math.abs(Date.now() - requestTime);

      if (isNaN(requestTime) || timeDiff > 10 * 60 * 1000) {
        throw new AppError('Request timestamp expired', 403);
      }

      if (reqHwid && !verifyClientSignature(reqKey, reqHwid, requestTime, sig)) {
        throw new AppError('Invalid payload integrity hash', 403);
      }
    }

    const keyItem = db.prepare('SELECT * FROM keys WHERE UPPER(key) = UPPER(?)').get(reqKey) as KeyRecord | undefined;

    if (!keyItem) {
      LogsService.logAction('system', 'Client Device', 'KEY_VERIFY_FAILED', `Failed verification attempt for non-existent key: "${reqKey}"`, { key: reqKey, hwid: reqHwid });
      return {
        success: false,
        status: 'invalid',
        error: 'Key does not exist',
        message: 'Invalid key! Key does not exist.',
      };
    }

    const now = new Date();
    if (
      keyItem.status === 'expired' ||
      (keyItem.expiresAt !== 'never' && new Date(keyItem.expiresAt) < now)
    ) {
      if (keyItem.status !== 'expired') {
        db.prepare("UPDATE keys SET status = 'expired' WHERE id = ?").run(keyItem.id);
      }
      LogsService.logAction('system', 'Client Device', 'KEY_EXPIRED', `Verification attempted on expired key: ${keyItem.key}`, { key: keyItem.key, hwid: reqHwid });
      return {
        success: false,
        status: 'expired',
        error: 'Key has expired',
        message: 'Your key has EXPIRED!',
      };
    }

    if (keyItem.status === 'revoked' || keyItem.status === 'banned') {
      LogsService.logAction('system', 'Client Device', 'KEY_REVOKED', `Verification attempted on revoked key: ${keyItem.key}`, { key: keyItem.key, hwid: reqHwid });
      return {
        success: false,
        status: 'invalid',
        error: 'Key has been revoked or banned',
        message: 'Key has been revoked or banned',
      };
    }

    const defaultTargetGame = 'com.herogame.gplay.lastdayrulessurvival';

    // Master Keys bypass HWID restrictions
    if (keyItem.isMasterKey === 1) {
      if (!keyItem.activatedAt) {
        db.prepare('UPDATE keys SET activatedAt = ? WHERE id = ?').run(now.toISOString(), keyItem.id);
      }
      LogsService.logAction('system', 'Client Device', 'MASTER_KEY_VERIFIED', `Master Key ${keyItem.key} verified`, { key: keyItem.key, hwid: reqHwid });
      return {
        success: true,
        status: 'authenticated',
        message: 'Master key authenticated',
        expiresAt: keyItem.expiresAt,
        targetGame: defaultTargetGame,
        isMasterKey: true,
      };
    }

    // 1. Mobile App Installer Validation -> Validate key active without binding HWID
    if (isInstaller || !reqHwid) {
      LogsService.logAction('system', 'Installer App', 'KEY_CHECK_ACTIVE', `Installer verified key ${keyItem.key} is active`, { key: keyItem.key });
      return {
        success: true,
        status: 'authenticated',
        message: 'Key is active',
        expiresAt: keyItem.expiresAt,
        targetGame: defaultTargetGame,
      };
    }

    // 2. In-Game Mod Menu (KeySystem.cpp) Validation & HWID Binding
    if (!keyItem.hwid) {
      // First in-game execution -> Bind key to this device's HWID!
      db.prepare('UPDATE keys SET hwid = ?, activatedAt = ? WHERE id = ?').run(reqHwid, now.toISOString(), keyItem.id);
      LogsService.logAction('system', 'Mod Menu', 'KEY_HWID_BOUND', `Key ${keyItem.key} bound to device HWID: ${reqHwid}`, { key: keyItem.key, hwid: reqHwid });
      return {
        success: true,
        status: 'authenticated',
        message: 'Key Authenticated & Bound Successfully!',
        expiresAt: keyItem.expiresAt,
        targetGame: defaultTargetGame,
      };
    }

    if (keyItem.hwid === reqHwid) {
      // Matching HWID -> Authenticated
      LogsService.logAction('system', 'Mod Menu', 'KEY_VERIFIED', `Key ${keyItem.key} authenticated for bound HWID: ${reqHwid}`, { key: keyItem.key, hwid: reqHwid });
      return {
        success: true,
        status: 'authenticated',
        message: 'Key Authenticated & Bound Successfully!',
        expiresAt: keyItem.expiresAt,
        targetGame: defaultTargetGame,
      };
    } else {
      // Mismatched HWID -> Rejected
      LogsService.logAction('system', 'Mod Menu', 'KEY_HWID_MISMATCH', `Key ${keyItem.key} HWID Mismatch! Bound: ${keyItem.hwid}, Attempted: ${reqHwid}`, { key: keyItem.key, boundHwid: keyItem.hwid, attemptedHwid: reqHwid });
      return {
        success: false,
        status: 'mismatch',
        error: 'Key is bound to another device!',
        message: 'Key is bound to another device!',
      };
    }
  }

  static getKeys(user: AuthUserPayload): KeyRecord[] {
    const { role, id, username } = user;
    const nowIso = new Date().toISOString();
    db.prepare("UPDATE keys SET status = 'expired' WHERE status = 'active' AND expiresAt != 'never' AND expiresAt <= ?").run(nowIso);

    if (role === 'owner') {
      return db.prepare('SELECT * FROM keys ORDER BY createdAt DESC').all() as KeyRecord[];
    } else if (role === 'manager') {
      return db.prepare(`
        SELECT DISTINCT k.* FROM keys k
        LEFT JOIN users u ON k.createdById = u.id
        WHERE k.createdById = ? OR k.createdByUsername = ? OR u.createdBy = ? OR u.createdBy = ?
        ORDER BY k.createdAt DESC
      `).all(id, username, id, username) as KeyRecord[];
    } else {
      return db.prepare('SELECT * FROM keys WHERE createdById = ? OR createdByUsername = ? ORDER BY createdAt DESC').all(id, username) as KeyRecord[];
    }
  }

  static generateKeys(user: AuthUserPayload, payload: GenerateKeysPayload & { customDays?: number; duration?: string }) {
    const { durationDays, customDays, duration, count, note, isMaster, paymentScreenshot } = payload;
    const numKeys = Math.max(1, parseInt(String(count), 10) || 1);

    let days = 0;
    if (durationDays !== undefined && durationDays !== null && durationDays !== '') {
      const parsed = parseInt(String(durationDays), 10);
      days = isNaN(parsed) ? 0 : parsed;
    }

    if (days === 0 && customDays !== undefined && customDays !== null && customDays !== '') {
      const parsed = parseInt(String(customDays), 10);
      if (!isNaN(parsed) && parsed > 0) {
        days = parsed;
      }
    }

    if (days === 0 && duration && typeof duration === 'string') {
      const lower = duration.toLowerCase();
      if (!lower.includes('lifetime') && !lower.includes('permanent') && !lower.includes('never')) {
        const match = duration.match(/\d+/);
        if (match) {
          days = parseInt(match[0], 10);
        }
      }
    }

    const isMasterKeyFlag = isMaster === true || isMaster === 'true' || isMaster === 1;

    if (isMasterKeyFlag && user.role !== 'owner' && user.role !== 'manager') {
      throw new AppError('Only Manager and Owner can create Master Keys.', 403);
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
      const userRow = db.prepare('SELECT COALESCE(tokens, credits, 0) as balance FROM users WHERE id = ?').get(user.id) as { balance: number } | undefined;
      const userBalance = userRow ? Number(userRow.balance || 0) : 0;

      if (userBalance < totalCost) {
        throw new AppError(`Insufficient token balance. Required: ${totalCost} tokens, Current balance: ${userBalance} tokens.`, 400);
      }

      db.prepare('UPDATE users SET tokens = MAX(0, tokens - ?), credits = MAX(0, credits - ?) WHERE id = ?').run(totalCost, totalCost, user.id);
    }

    const savedScreenshotUrl = saveBase64Image(paymentScreenshot || '');
    const createdKeys: KeyRecord[] = [];
    const now = new Date();

    const insertStmt = db.prepare(`
      INSERT INTO keys (id, key, expiresAt, createdAt, createdById, createdByUsername, note, isMasterKey, paymentScreenshot, costTokens)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < numKeys; i++) {
      let expiresAt = 'never';
      if (days > 0) {
        expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const keyStr = generateKeyString(isMasterKeyFlag);
      const keyId = generateUUID();
      const noteText = note || (isMasterKeyFlag ? (days === 0 ? 'Master Key (Lifetime)' : `Master Key (${days} Days)`) : (days === 0 ? 'Lifetime Key' : `${days} Days Key`));

      insertStmt.run(
        keyId,
        keyStr,
        expiresAt,
        now.toISOString(),
        user.id,
        user.username,
        noteText,
        isMasterKeyFlag ? 1 : 0,
        savedScreenshotUrl,
        costPerKey
      );

      createdKeys.push({
        id: keyId,
        key: keyStr,
        hwid: null,
        status: 'active',
        expiresAt,
        createdAt: now.toISOString(),
        activatedAt: null,
        createdById: user.id,
        createdByUsername: user.username,
        note: noteText,
        isMasterKey: isMasterKeyFlag ? 1 : 0,
        paymentScreenshot: savedScreenshotUrl,
        costTokens: costPerKey,
      });
    }

    const firstKey = createdKeys[0]?.key || '';
    const keySummary = numKeys === 1 ? firstKey : `${numKeys} Keys (First: ${firstKey})`;

    LogsService.logAction(
      user.id,
      user.username,
      'KEYS_GENERATED',
      `Issued ${numKeys} ${isMasterKeyFlag ? 'Master ' : ''}Key(s) [${keySummary}] • Duration: ${days === 0 ? 'Lifetime' : `${days} Days`} • Cost: ${totalCost} Tokens • Note: "${note || 'N/A'}"`,
      { count: numKeys, costTokens: totalCost, isMasterKey: isMasterKeyFlag, note }
    );

    return {
      success: true,
      count: createdKeys.length,
      keys: createdKeys,
    };
  }

  static resetHwid(user: AuthUserPayload, keyId: string) {
    if (!keyId) throw new AppError('Key ID is required.', 400);

    const keyItem = db.prepare('SELECT key, hwid FROM keys WHERE id = ? OR key = ?').get(keyId, keyId) as KeyRecord | undefined;
    const keyStr = keyItem ? keyItem.key : keyId;
    const oldHwid = keyItem?.hwid || 'Unknown';

    db.prepare('UPDATE keys SET hwid = null WHERE id = ? OR key = ?').run(keyId, keyId);

    LogsService.logAction(
      user.id,
      user.username,
      'KEY_HWID_RESET',
      `Unbound HWID for key ${keyStr} (Previously bound to: ${oldHwid})`,
      { key: keyStr, oldHwid }
    );

    return { success: true, message: 'HWID reset successfully.' };
  }

  static deleteKey(user: AuthUserPayload, keyId: string) {
    if (!keyId) throw new AppError('Key ID is required.', 400);

    const keyItem = db.prepare('SELECT key, createdByUsername FROM keys WHERE id = ? OR key = ?').get(keyId, keyId) as KeyRecord | undefined;
    const keyStr = keyItem ? keyItem.key : keyId;
    const creator = keyItem ? keyItem.createdByUsername : 'Unknown';

    db.prepare('DELETE FROM keys WHERE id = ? OR key = ?').run(keyId, keyId);

    LogsService.logAction(
      user.id,
      user.username,
      'KEY_DELETED',
      `Deleted / revoked key: ${keyStr} (Original Creator: ${creator})`,
      { key: keyStr, creator }
    );

    return { success: true, message: 'Key deleted successfully.' };
  }
}
