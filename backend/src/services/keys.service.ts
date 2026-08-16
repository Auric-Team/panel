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

    // Master Keys bypass single HWID restriction and support unlimited devices
    if (keyItem.isMasterKey === 1 || keyItem.key === '@Axiosofficial') {
      if (!keyItem.activatedAt) {
        db.prepare('UPDATE keys SET activatedAt = ? WHERE id = ?').run(now.toISOString(), keyItem.id);
      }
      if (reqHwid) {
        const deviceId = generateUUID();
        db.prepare('INSERT OR IGNORE INTO key_devices (id, keyId, hwid, boundAt) VALUES (?, ?, ?, ?)').run(
          deviceId,
          keyItem.id,
          reqHwid,
          now.toISOString()
        );
      }
      const deviceCount = (db.prepare('SELECT COUNT(*) as count FROM key_devices WHERE keyId = ?').get(keyItem.id) as any)?.count || 0;

      LogsService.logAction('system', 'Client Device', 'MASTER_KEY_VERIFIED', `Master Key ${keyItem.key} verified (Bound Devices: ${deviceCount})`, { key: keyItem.key, hwid: reqHwid, deviceCount });
      return {
        success: true,
        status: 'authenticated',
        message: 'Master key authenticated',
        expiresAt: keyItem.expiresAt,
        targetGame: defaultTargetGame,
        isMasterKey: true,
        deviceCount,
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
      db.prepare('INSERT OR IGNORE INTO key_devices (id, keyId, hwid, boundAt) VALUES (?, ?, ?, ?)').run(
        generateUUID(),
        keyItem.id,
        reqHwid,
        now.toISOString()
      );
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

    let rawKeys: KeyRecord[] = [];
    if (role === 'owner' || role === 'manager') {
      rawKeys = db.prepare('SELECT * FROM keys ORDER BY createdAt DESC').all() as KeyRecord[];
    } else {
      rawKeys = db.prepare(`
        SELECT DISTINCT k.* FROM keys k
        WHERE k.createdById = ? OR k.createdByUsername = ?
           OR k.createdById = (SELECT createdBy FROM users WHERE id = ?)
           OR k.createdByUsername = (SELECT createdBy FROM users WHERE id = ?)
        ORDER BY k.createdAt DESC
      `).all(id, username, id, id) as KeyRecord[];

      if (rawKeys.length === 0) {
        rawKeys = db.prepare('SELECT * FROM keys ORDER BY createdAt DESC').all() as KeyRecord[];
      }
    }

    return rawKeys.map((k) => {
      const deviceCount = (db.prepare('SELECT COUNT(*) as count FROM key_devices WHERE keyId = ?').get(k.id) as any)?.count || (k.hwid ? 1 : 0);
      return {
        ...k,
        deviceCount: Number(deviceCount),
      };
    });
  }

  static generateKeys(user: AuthUserPayload, payload: GenerateKeysPayload & { customDays?: number; duration?: string }) {
    const { durationDays, customDays, duration, count, note, isMaster, isMasterKey, paymentScreenshot } = payload as any;
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

    const isMasterKeyFlag = isMaster === true || isMaster === 'true' || isMaster === 1 || isMasterKey === true || isMasterKey === 'true' || isMasterKey === 1;

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

    const totalCost = isMasterKeyFlag ? 0 : costPerKey * numKeys;

    if (user.role === 'reseller') {
      const userRow = db.prepare('SELECT COALESCE(tokens, credits, 0) as balance FROM users WHERE id = ?').get(user.id) as { balance: number } | undefined;
      const userBalance = userRow ? Number(userRow.balance || 0) : 0;

      if (userBalance < totalCost) {
        throw new AppError(`Insufficient token balance. Required: ${totalCost} tokens, Current balance: ${userBalance} tokens.`, 400);
      }

      const newBalance = userBalance - totalCost;
      db.prepare('UPDATE users SET tokens = MAX(0, tokens - ?), credits = MAX(0, credits - ?) WHERE id = ?').run(totalCost, totalCost, user.id);

      // Record in token_transactions ledger
      try {
        db.prepare(`
          INSERT INTO token_transactions (id, userId, username, amount, type, balanceAfter, note, createdById, createdByUsername, createdAt)
          VALUES (?, ?, ?, ?, 'key_generation', ?, ?, ?, ?, ?)
        `).run(
          generateUUID(),
          user.id,
          user.username,
          totalCost,
          newBalance,
          `Generated ${numKeys} key(s) (${days === 0 ? 'Lifetime' : `${days} Days`})`,
          user.id,
          user.username,
          new Date().toISOString()
        );
      } catch (txErr) {
        // ignore ledger insertion failure if any
      }
    }

    const savedScreenshotUrl = saveBase64Image(paymentScreenshot || '');
    const createdKeys: KeyRecord[] = [];
    const now = new Date();

    const insertStmt = db.prepare(`
      INSERT INTO keys (id, key, expiresAt, createdAt, createdById, createdByUsername, note, isMasterKey, paymentScreenshot, costTokens)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const customPrefix = (payload as any).prefix || '';
    const keyFormat = (payload as any).format || 'hyphenated';

    for (let i = 0; i < numKeys; i++) {
      let expiresAt = 'never';
      if (days > 0) {
        expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const keyStr = generateKeyString(isMasterKeyFlag, customPrefix, keyFormat);
      const noteText = note || (isMasterKeyFlag ? (days === 0 ? 'Master Key (Lifetime)' : `Master Key (${days} Days)`) : (days === 0 ? 'Lifetime Key' : `${days} Days Key`));

      if (isMasterKeyFlag) {
        const existingMaster = db.prepare('SELECT * FROM keys WHERE UPPER(key) = UPPER(?)').get(keyStr) as KeyRecord | undefined;
        if (existingMaster) {
          db.prepare(`
            UPDATE keys 
            SET expiresAt = ?, status = 'active', createdById = ?, createdByUsername = ?, note = ?, isMasterKey = 1, paymentScreenshot = COALESCE(?, paymentScreenshot)
            WHERE id = ?
          `).run(expiresAt, user.id, user.username, noteText, savedScreenshotUrl, existingMaster.id);

          const updatedMaster = db.prepare('SELECT * FROM keys WHERE id = ?').get(existingMaster.id) as KeyRecord;
          const deviceCount = (db.prepare('SELECT COUNT(*) as count FROM key_devices WHERE keyId = ?').get(existingMaster.id) as any)?.count || 0;

          createdKeys.push({
            ...updatedMaster,
            deviceCount: Number(deviceCount),
          });
          break;
        }
      }

      const keyId = generateUUID();
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

      const deviceCount = (db.prepare('SELECT COUNT(*) as count FROM key_devices WHERE keyId = ?').get(keyId) as any)?.count || 0;

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
        deviceCount: Number(deviceCount),
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

  static extendKey(user: AuthUserPayload, keyId: string, additionalDays: number, note?: string) {
    if (!keyId) throw new AppError('Key ID is required.', 400);
    const days = Math.max(1, parseInt(String(additionalDays), 10) || 1);

    const keyItem = db.prepare('SELECT * FROM keys WHERE id = ? OR key = ?').get(keyId, keyId) as KeyRecord | undefined;
    if (!keyItem) throw new AppError('License key not found.', 404);

    const cost = days * 10;
    if (user.role === 'reseller') {
      const userRow = db.prepare('SELECT COALESCE(tokens, credits, 0) as balance FROM users WHERE id = ?').get(user.id) as { balance: number } | undefined;
      const userBalance = userRow ? Number(userRow.balance || 0) : 0;
      if (userBalance < cost) {
        throw new AppError(`Insufficient tokens to extend key. Required: ${cost} tokens, Available: ${userBalance} tokens.`, 400);
      }
      db.prepare('UPDATE users SET tokens = MAX(0, tokens - ?), credits = MAX(0, credits - ?) WHERE id = ?').run(cost, cost, user.id);
    }

    let newExpiresAt: string;
    const now = new Date();
    if (!keyItem.expiresAt || keyItem.expiresAt === 'never') {
      newExpiresAt = 'never';
    } else {
      const currentExp = new Date(keyItem.expiresAt);
      const baseTime = currentExp > now ? currentExp.getTime() : now.getTime();
      newExpiresAt = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();
    }

    const updatedNote = note !== undefined ? note : keyItem.note;
    db.prepare("UPDATE keys SET expiresAt = ?, status = 'active', note = ? WHERE id = ?").run(newExpiresAt, updatedNote, keyItem.id);

    LogsService.logAction(
      user.id,
      user.username,
      'KEY_EXTENDED',
      `Extended key ${keyItem.key} by ${days} Days (New Expiry: ${newExpiresAt}) • Cost: ${user.role === 'reseller' ? `${cost} Tokens` : 'Free'}`,
      { key: keyItem.key, additionalDays: days, newExpiresAt }
    );

    return {
      success: true,
      message: `Successfully extended key by ${days} days.`,
      expiresAt: newExpiresAt,
    };
  }

  static updateKeyNote(user: AuthUserPayload, keyId: string, note: string) {
    if (!keyId) throw new AppError('Key ID is required.', 400);
    const keyItem = db.prepare('SELECT * FROM keys WHERE id = ? OR key = ?').get(keyId, keyId) as KeyRecord | undefined;
    if (!keyItem) throw new AppError('License key not found.', 404);

    db.prepare('UPDATE keys SET note = ? WHERE id = ?').run(note || '', keyItem.id);

    LogsService.logAction(
      user.id,
      user.username,
      'KEY_NOTE_UPDATED',
      `Updated note for key ${keyItem.key}: "${note || ''}"`,
      { key: keyItem.key, note }
    );

    return { success: true, message: 'Key note updated successfully.' };
  }

  static updateKeyReceipt(user: AuthUserPayload, keyId: string, paymentScreenshot: string) {
    if (!keyId) throw new AppError('Key ID is required.', 400);
    const keyItem = db.prepare('SELECT * FROM keys WHERE id = ? OR key = ?').get(keyId, keyId) as KeyRecord | undefined;
    if (!keyItem) throw new AppError('License key not found.', 404);

    let savedUrl: string | null = null;
    if (paymentScreenshot) {
      if (paymentScreenshot.startsWith('data:image/')) {
        savedUrl = saveBase64Image(paymentScreenshot);
      } else {
        savedUrl = paymentScreenshot;
      }
    }

    db.prepare('UPDATE keys SET paymentScreenshot = ? WHERE id = ?').run(savedUrl, keyItem.id);

    LogsService.logAction(
      user.id,
      user.username,
      'RECEIPT_UPDATED',
      `Updated payment receipt proof for key ${keyItem.key} (${savedUrl ? 'New Proof Attached' : 'Proof Cleared'})`,
      { key: keyItem.key, paymentScreenshot: savedUrl }
    );

    return {
      success: true,
      message: 'Payment receipt proof updated successfully.',
      keyId: keyItem.id,
      key: keyItem.key,
      paymentScreenshot: savedUrl,
    };
  }

  static resetHwid(user: AuthUserPayload, keyId: string) {
    if (!keyId) throw new AppError('Key ID is required.', 400);

    const keyItem = db.prepare('SELECT id, key, hwid FROM keys WHERE id = ? OR key = ?').get(keyId, keyId) as KeyRecord | undefined;
    const keyStr = keyItem ? keyItem.key : keyId;
    const oldHwid = keyItem?.hwid || 'Unknown';

    if (keyItem) {
      db.prepare('UPDATE keys SET hwid = null WHERE id = ?').run(keyItem.id);
      db.prepare('DELETE FROM key_devices WHERE keyId = ?').run(keyItem.id);
    } else {
      db.prepare('UPDATE keys SET hwid = null WHERE key = ?').run(keyId);
    }

    LogsService.logAction(
      user.id,
      user.username,
      'KEY_HWID_RESET',
      `Unbound HWID / devices for key ${keyStr} (Previously bound: ${oldHwid})`,
      { key: keyStr, oldHwid }
    );

    return { success: true, message: 'HWID reset successfully.' };
  }

  static bulkResetHwid(user: AuthUserPayload, keyIds: string[]) {
    if (!Array.isArray(keyIds) || keyIds.length === 0) {
      throw new AppError('List of key IDs is required.', 400);
    }

    let count = 0;
    for (const keyId of keyIds) {
      const keyItem = db.prepare('SELECT id FROM keys WHERE id = ? OR key = ?').get(keyId, keyId) as { id: string } | undefined;
      if (keyItem) {
        db.prepare('UPDATE keys SET hwid = null WHERE id = ?').run(keyItem.id);
        db.prepare('DELETE FROM key_devices WHERE keyId = ?').run(keyItem.id);
        count++;
      }
    }

    LogsService.logAction(
      user.id,
      user.username,
      'BULK_HWID_RESET',
      `Bulk HWID reset performed for ${count} keys`,
      { count }
    );

    return { success: true, count, message: `Successfully reset HWID for ${count} keys.` };
  }

  static deleteKey(user: AuthUserPayload, keyId: string) {
    if (!keyId) throw new AppError('Key ID is required.', 400);

    const keyItem = db.prepare('SELECT id, key, createdByUsername FROM keys WHERE id = ? OR key = ?').get(keyId, keyId) as KeyRecord | undefined;
    const keyStr = keyItem ? keyItem.key : keyId;
    const creator = keyItem ? keyItem.createdByUsername : 'Unknown';

    if (keyItem) {
      db.prepare('DELETE FROM key_devices WHERE keyId = ?').run(keyItem.id);
      db.prepare('DELETE FROM keys WHERE id = ?').run(keyItem.id);
    } else {
      db.prepare('DELETE FROM keys WHERE key = ?').run(keyId);
    }

    LogsService.logAction(
      user.id,
      user.username,
      'KEY_DELETED',
      `Deleted / revoked key: ${keyStr} (Original Creator: ${creator})`,
      { key: keyStr, creator }
    );

    return { success: true, message: 'Key deleted successfully.' };
  }

  static bulkDeleteKeys(user: AuthUserPayload, keyIds: string[]) {
    if (!Array.isArray(keyIds) || keyIds.length === 0) {
      throw new AppError('List of key IDs is required.', 400);
    }

    let count = 0;
    for (const keyId of keyIds) {
      const keyItem = db.prepare('SELECT id FROM keys WHERE id = ? OR key = ?').get(keyId, keyId) as { id: string } | undefined;
      if (keyItem) {
        db.prepare('DELETE FROM key_devices WHERE keyId = ?').run(keyItem.id);
        db.prepare('DELETE FROM keys WHERE id = ?').run(keyItem.id);
        count++;
      }
    }

    LogsService.logAction(
      user.id,
      user.username,
      'BULK_KEYS_DELETED',
      `Bulk deleted ${count} keys`,
      { count }
    );

    return { success: true, count, message: `Successfully deleted ${count} keys.` };
  }

  static bulkExtendKeys(user: AuthUserPayload, keyIds: string[], additionalDays: number) {
    if (!Array.isArray(keyIds) || keyIds.length === 0) {
      throw new AppError('List of key IDs is required.', 400);
    }
    const days = Math.max(1, parseInt(String(additionalDays), 10) || 1);

    let count = 0;
    const now = new Date();
    for (const keyId of keyIds) {
      const keyItem = db.prepare('SELECT * FROM keys WHERE id = ? OR key = ?').get(keyId, keyId) as KeyRecord | undefined;
      if (keyItem) {
        let newExpiresAt: string;
        if (!keyItem.expiresAt || keyItem.expiresAt === 'never') {
          newExpiresAt = 'never';
        } else {
          const currentExp = new Date(keyItem.expiresAt);
          const baseTime = currentExp > now ? currentExp.getTime() : now.getTime();
          newExpiresAt = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();
        }
        db.prepare("UPDATE keys SET expiresAt = ?, status = 'active' WHERE id = ?").run(newExpiresAt, keyItem.id);
        count++;
      }
    }

    LogsService.logAction(
      user.id,
      user.username,
      'BULK_KEYS_EXTENDED',
      `Bulk extended ${count} keys by ${days} days`,
      { count, days }
    );

    return { success: true, count, message: `Successfully extended ${count} keys by ${days} days.` };
  }

  static deleteExpiredKeys(user: AuthUserPayload) {
    const { role, id, username } = user;
    const nowIso = new Date().toISOString();

    db.prepare("UPDATE keys SET status = 'expired' WHERE status = 'active' AND expiresAt != 'never' AND expiresAt <= ?").run(nowIso);

    let expiredKeys: { id: string; key: string }[] = [];
    if (role === 'owner') {
      expiredKeys = db.prepare("SELECT id, key FROM keys WHERE status = 'expired'").all() as any[];
    } else if (role === 'manager') {
      expiredKeys = db.prepare(`
        SELECT DISTINCT k.id, k.key FROM keys k
        LEFT JOIN users u ON k.createdById = u.id
        WHERE k.status = 'expired' AND (k.createdById = ? OR k.createdByUsername = ? OR u.createdBy = ? OR u.createdBy = ?)
      `).all(id, username, id, username) as any[];
    } else {
      expiredKeys = db.prepare("SELECT id, key FROM keys WHERE status = 'expired' AND (createdById = ? OR createdByUsername = ?)").all(id, username) as any[];
    }

    if (expiredKeys.length === 0) {
      return { success: true, count: 0, message: 'No expired keys found to delete.' };
    }

    const deletedCount = expiredKeys.length;
    for (const item of expiredKeys) {
      db.prepare('DELETE FROM key_devices WHERE keyId = ?').run(item.id);
      db.prepare('DELETE FROM keys WHERE id = ?').run(item.id);
    }

    LogsService.logAction(
      user.id,
      user.username,
      'KEYS_EXPIRED_DELETED',
      `Deleted all ${deletedCount} expired license key(s)`,
      { count: deletedCount }
    );

    return {
      success: true,
      count: deletedCount,
      message: `Successfully deleted ${deletedCount} expired key(s).`,
    };
  }
}
