import { KeyItem, UserItem, StatsOverview, SalesDataPoint } from '@/types/key';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://103.207.181.125:20067';

// Empty initial datasets
const MOCK_KEYS: KeyItem[] = [];
const MOCK_USERS: UserItem[] = [];

let localKeysStore: KeyItem[] = [];
let localUsersStore: UserItem[] = [];

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
    // Backend offline / not reachable directly
  }
  return { isConnected: false, url: `${API_BASE_URL} (Local Engine)` };
}

export async function fetchAllKeys(token?: string): Promise<{ keys: KeyItem[]; isLive: boolean; isAuthError?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/keys`, {
      headers: { Authorization: `Bearer ${token || ''}` },
      cache: 'no-store',
    });
    if (res.status === 401) {
      return { keys: [], isLive: false, isAuthError: true };
    }
    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : (data.keys || []);
      const formattedKeys: KeyItem[] = rawList.map((k: any) => ({
        id: k.id || k.key,
        key: k.key,
        status: k.status || 'active',
        hwid: k.hwid || null,
        duration: k.duration || (k.expiresAt === 'never' ? 'Lifetime' : 'Custom'),
        costTokens: k.costTokens || 10,
        createdAt: k.createdAt || new Date().toISOString(),
        expiresAt: k.expiresAt === 'never' ? null : k.expiresAt,
        note: k.note || '',
        createdByUsername: k.createdByUsername || k.createdBy || 'System',
        paymentScreenshot: k.paymentScreenshot || null,
        isMasterKey: k.isMasterKey || 0,
      }));
      localKeysStore = formattedKeys;
      return { keys: formattedKeys, isLive: true };
    }
  } catch {
    // API Fallback
  }
  return { keys: localKeysStore, isLive: false };
}

export async function fetchAllUsers(token?: string): Promise<{ users: UserItem[]; isLive: boolean; isAuthError?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token || ''}` },
      cache: 'no-store',
    });
    if (res.status === 401) {
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
        createdBy: u.createdBy || 'OwnerAdmin',
      }));
      localUsersStore = formattedUsers;
      return { users: formattedUsers, isLive: true };
    }
  } catch {
    // API Fallback
  }
  return { users: localUsersStore, isLive: false };
}

export async function updateUserTokensApi(
  userId: string,
  newTokenBalance: number,
  token?: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/update-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify({ userId, tokens: newTokenBalance }),
    });
    if (res.ok) return true;
  } catch {
    // API Fallback
  }

  localUsersStore = localUsersStore.map((u) =>
    u.id === userId ? { ...u, tokens: newTokenBalance, credits: newTokenBalance } : u
  );
  return true;
}

export async function generateKeysApi(
  duration: string,
  count: number,
  note: string,
  paymentScreenshot?: string | null,
  isMasterKey?: boolean,
  userToken?: string,
  currentUser?: any
): Promise<{ newKeys: KeyItem[]; generatedStrings: string[] }> {
  let durationDays = 7;
  let costPerKey = 70;

  if (duration === '1 Day' || duration.includes('1 Day')) {
    durationDays = 1;
    costPerKey = 10;
  } else if (duration === '7 Days' || duration.includes('7 Days')) {
    durationDays = 7;
    costPerKey = 70;
  } else if (duration === '30 Days' || duration.includes('30 Days')) {
    durationDays = 30;
    costPerKey = 250;
  } else if (duration === 'Lifetime' || duration.includes('Lifetime')) {
    durationDays = 0;
    costPerKey = 300;
  } else {
    // Custom
    const daysMatch = duration.match(/\d+/);
    const customDays = daysMatch ? parseInt(daysMatch[0], 10) : 10;
    durationDays = customDays;
    costPerKey = customDays * 10;
  }

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
        createdByUsername: currentUser?.username || 'OwnerAdmin',
        paymentScreenshot: paymentScreenshot || null,
        isMasterKey: isMasterKey ? 1 : 0,
      }));
      return {
        newKeys: createdKeys,
        generatedStrings: createdKeys.map((k) => k.key),
      };
    }
  } catch {
    // API Fallback
  }

  // Deduct tokens locally if reseller
  if (currentUser && currentUser.role === 'reseller') {
    localUsersStore = localUsersStore.map((u) =>
      u.username === currentUser.username
        ? { ...u, tokens: Math.max(0, (u.tokens || 0) - totalCost) }
        : u
    );
  }

  const generated: KeyItem[] = [];
  const generatedStrings: string[] = [];

  for (let i = 0; i < count; i++) {
    const randomHex = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    const keyStr = isMasterKey
      ? `AXIOS-MASTER-${randomHex()}-${randomHex()}`
      : `AXIOS-${randomHex()}-${randomHex()}-${randomHex()}`;

    let expiresAt: string | null = null;
    if (durationDays > 0) {
      expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
    }

    const newItem: KeyItem = {
      id: `key-gen-${Date.now()}-${i}`,
      key: keyStr,
      status: 'active',
      hwid: null,
      duration,
      costTokens: costPerKey,
      createdAt: new Date().toISOString(),
      expiresAt,
      note: note || 'Panel Issued',
      createdByUsername: currentUser?.username || 'OwnerAdmin',
      paymentScreenshot: paymentScreenshot || null,
      isMasterKey: isMasterKey ? 1 : 0,
    };

    generated.push(newItem);
    generatedStrings.push(keyStr);
  }

  localKeysStore = [...generated, ...localKeysStore];
  return { newKeys: generated, generatedStrings };
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
    // API Fallback
  }

  localKeysStore = localKeysStore.map((k) =>
    k.id === keyId ? { ...k, hwid: null } : k
  );
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
    // API Fallback
  }

  localKeysStore = localKeysStore.filter((k) => k.id !== keyId);
  return true;
}
