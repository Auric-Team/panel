import { KeyItem, UserItem } from '@/types/key';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.axioshacks.com';

let localKeysStore: KeyItem[] = [];
let localUsersStore: UserItem[] = [];

export interface AuditLogItem {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export async function checkBackendConnection(): Promise<{ isConnected: boolean; url: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      return { isConnected: true, url: API_BASE_URL };
    }
  } catch {
    // Backend connection check error
  }
  return { isConnected: false, url: API_BASE_URL };
}

export async function fetchLogsApi(token?: string, limit = 500): Promise<{ logs: AuditLogItem[]; isLive: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/logs?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token || ''}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return { logs: Array.isArray(data) ? data : [], isLive: true };
    }
  } catch {
    // Fallback
  }
  return { logs: [], isLive: false };
}

export async function clearLogsApi(token?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/logs/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
    });
    const data = await res.json();
    if (res.ok) return { success: true, message: data.message };
    return { success: false, message: data.message || 'Failed to clear logs' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error' };
  }
}

export async function fetchAllKeys(token?: string): Promise<{ keys: KeyItem[]; isLive: boolean; isAuthError?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/keys`, {
      headers: { Authorization: `Bearer ${token || ''}` },
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) {
      return { keys: [], isLive: false, isAuthError: true };
    }
    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : (data.keys || []);
      const formattedKeys: KeyItem[] = rawList.map((k: any) => {
        const createdAt = k.createdAt || new Date().toISOString();
        const expiresAt = (!k.expiresAt || k.expiresAt === 'never') ? null : k.expiresAt;

        let calculatedDuration = k.duration;
        if (!calculatedDuration) {
          if (!expiresAt) {
            calculatedDuration = 'Lifetime';
          } else {
            const expTime = new Date(expiresAt).getTime();
            const createTime = new Date(createdAt).getTime();
            if (!isNaN(expTime) && !isNaN(createTime)) {
              const diffDays = Math.round((expTime - createTime) / (24 * 60 * 60 * 1000));
              calculatedDuration = diffDays <= 1 ? '1 Day' : `${diffDays} Days`;
            } else {
              calculatedDuration = 'Custom';
            }
          }
        }

        return {
          id: k.id || k.key,
          key: k.key,
          status: k.status || 'active',
          hwid: k.hwid || null,
          duration: calculatedDuration,
          costTokens: k.costTokens || 0,
          createdAt: createdAt,
          expiresAt: expiresAt,
          note: k.note || '',
          createdByUsername: k.createdByUsername || k.createdBy || 'System',
          paymentScreenshot: k.paymentScreenshot || null,
          isMasterKey: k.isMasterKey || 0,
        };
      });
      localKeysStore = formattedKeys;
      return { keys: formattedKeys, isLive: true };
    }
  } catch {
    // API fallback
  }
  return { keys: localKeysStore, isLive: false };
}

export async function fetchAllUsers(token?: string): Promise<{ users: UserItem[]; isLive: boolean; isAuthError?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token || ''}` },
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) {
      return { users: [], isLive: false, isAuthError: true };
    }
    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : (data.users || []);
      const formattedUsers: UserItem[] = rawList.map((u: any) => ({
        id: u.id || u.username,
        username: u.username,
        role: u.role || 'reseller',
        tokens: u.tokens !== undefined ? u.tokens : (u.credits || 0),
        credits: u.credits,
        isBlocked: u.isBlocked || 0,
        createdAt: u.createdAt || new Date().toISOString(),
        createdBy: u.createdBy || 'Owner',
      }));
      localUsersStore = formattedUsers;
      return { users: formattedUsers, isLive: true };
    }
  } catch {
    // API fallback
  }
  return { users: localUsersStore, isLive: false };
}

export async function updateUserTokensApi(
  userId: string,
  amount: number,
  action: 'add' | 'deduct',
  token?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/update-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify({ userId, amount, action }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, newBalance: data.newBalance };
    }
    return { success: false, error: data.error || data.message || 'Failed to update tokens' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function generateKeysApi(
  duration: string,
  count: number,
  note: string,
  paymentScreenshot?: string | null,
  isMasterKey?: boolean,
  userToken?: string,
  currentUser?: UserItem | null
): Promise<{ newKeys: KeyItem[]; generatedStrings: string[] }> {
  let durationDays = 0;
  if (duration === 'Lifetime' || duration.includes('Lifetime')) {
    durationDays = 0;
  } else {
    const match = duration.match(/\d+/);
    durationDays = match ? parseInt(match[0], 10) : 7;
  }

  let costPerKey = 0;
  if (durationDays === 1) costPerKey = 10;
  else if (durationDays === 7) costPerKey = 70;
  else if (durationDays === 30) costPerKey = 250;
  else if (durationDays === 0) costPerKey = 300;
  else costPerKey = durationDays * 10;

  if (isMasterKey) costPerKey = 0;
  const totalCost = costPerKey * count;

  try {
    const res = await fetch(`${API_BASE_URL}/api/keys/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken || ''}`,
      },
      body: JSON.stringify({
        durationDays,
        count,
        note,
        paymentScreenshot,
        isMaster: isMasterKey,
        costTokens: totalCost,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const createdKeys: KeyItem[] = (data.keys || []).map((k: any) => ({
        id: k.id || k.key,
        key: k.key,
        status: k.status || 'active',
        hwid: k.hwid || null,
        duration: duration,
        costTokens: costPerKey,
        createdAt: k.createdAt || new Date().toISOString(),
        expiresAt: k.expiresAt === 'never' ? null : k.expiresAt,
        note: k.note || '',
        createdByUsername: currentUser?.username || 'Owner',
        paymentScreenshot: paymentScreenshot || null,
        isMasterKey: isMasterKey ? 1 : 0,
      }));
      return {
        newKeys: createdKeys,
        generatedStrings: createdKeys.map((k) => k.key),
      };
    }
  } catch {
    // API fallback
  }

  return { newKeys: [], generatedStrings: [] };
}

export async function resetHwidApi(keyId: string, token?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/keys/reset-hwid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify({ id: keyId }),
    });
    if (res.ok) return true;
  } catch {
    // API fallback
  }
  return true;
}

export async function deleteKeyApi(keyId: string, token?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/keys/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify({ id: keyId }),
    });
    if (res.ok) return true;
  } catch {
    // API fallback
  }
  return true;
}

export async function toggleBlockUserApi(userId: string, isBlocked: boolean, token?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/toggle-block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify({ userId, isBlocked }),
    });
    if (res.ok) return true;
  } catch {
    // API fallback
  }
  return true;
}

export async function deleteUserApi(userId: string, token?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (res.ok && data.success) return { success: true };
    return { success: false, error: data.error || data.message || 'Failed to delete user' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

// Global API Object Wrapper for Page integration
export const api = {
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Login failed');
    return data;
  },

  verify2FA: async (userId: string, pin: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || '2FA verification failed');
    return data;
  },

  getAnalytics: async (token: string) => {
    const res = await fetch(`${API_BASE_URL}/api/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return await res.json();
  },

  getLogs: async (token: string, limit = 500) => {
    const result = await fetchLogsApi(token, limit);
    return result.logs;
  },

  clearLogs: async (token: string) => {
    return await clearLogsApi(token);
  },

  getKeys: async (token: string) => {
    const result = await fetchAllKeys(token);
    return result.keys;
  },

  getUsers: async (token: string) => {
    const result = await fetchAllUsers(token);
    return result.users;
  },

  generateKeys: async (token: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/api/keys/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Failed to generate keys');
    return data;
  },

  resetHwid: async (token: string, keyId: string) => {
    return await resetHwidApi(keyId, token);
  },

  deleteKey: async (token: string, keyId: string) => {
    return await deleteKeyApi(keyId, token);
  },

  createUser: async (token: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/api/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Failed to create user');
    return data;
  },

  toggleBlockUser: async (token: string, userId: string, isBlocked: boolean) => {
    return await toggleBlockUserApi(userId, isBlocked, token);
  },

  updateTokens: async (token: string, userId: string, amount: number, action: 'add' | 'deduct') => {
    return await updateUserTokensApi(userId, amount, action, token);
  },

  deleteUser: async (token: string, userId: string) => {
    return await deleteUserApi(userId, token);
  },
};
