import { KeyItem, StatsOverview } from '@/types/key';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://103.207.181.125:20067';

// Initial fallback mock keys to ensure dashboard works out of the box
const MOCK_KEYS: KeyItem[] = [
  {
    id: 'key-1',
    key: 'AXIOS-9F2B-8C4A-710E',
    status: 'active',
    hwid: 'HWID-88A9-BF31-2C90',
    duration: '30 Days',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 25 * 86400000).toISOString(),
    note: 'VIP - Alex',
  },
  {
    id: 'key-2',
    key: 'AXIOS-4A1C-9D03-1E5F',
    status: 'active',
    hwid: null,
    duration: '7 Days',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 6 * 86400000).toISOString(),
    note: 'Trial - GamingZone',
  },
  {
    id: 'key-3',
    key: 'AXIOS-77E0-33F1-99B2',
    status: 'expired',
    hwid: 'HWID-11B3-44C5-66D7',
    duration: '1 Day',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    note: 'Streamer Pass',
  },
  {
    id: 'key-4',
    key: 'AXIOS-LIFE-9999-XXXX',
    status: 'active',
    hwid: 'HWID-EEFF-0011-2233',
    duration: 'Lifetime',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    expiresAt: null,
    note: 'Owner Key',
  },
  {
    id: 'key-5',
    key: 'AXIOS-8812-7A9B-004C',
    status: 'revoked',
    hwid: 'HWID-9988-7766-5544',
    duration: '30 Days',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 86400000).toISOString(),
    note: 'Abuse Flagged',
  },
];

let localKeysStore: KeyItem[] = [...MOCK_KEYS];

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
    // Offline / Backend not active yet
  }
  return { isConnected: false, url: `${API_BASE_URL} (Local Mock)` };
}

export async function fetchAllKeys(): Promise<{ keys: KeyItem[]; isLive: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/keys`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : (data.keys || []);
      const formattedKeys: KeyItem[] = rawList.map((k: any) => ({
        id: k.id || k.key,
        key: k.key,
        status: k.status || 'active',
        hwid: k.hwid || null,
        duration: k.expiresAt === 'never' ? 'Lifetime' : 'Custom',
        createdAt: k.createdAt || new Date().toISOString(),
        expiresAt: k.expiresAt === 'never' ? null : k.expiresAt,
        note: k.note || '',
      }));
      localKeysStore = formattedKeys;
      return { keys: formattedKeys, isLive: true };
    }
  } catch (e) {
    console.warn("Backend API offline, falling back to local state store.");
  }
  return { keys: localKeysStore, isLive: false };
}

export async function generateKeysApi(
  duration: string,
  count: number,
  note: string
): Promise<{ newKeys: KeyItem[]; generatedStrings: string[] }> {
  let durationDays = 30;
  if (duration.includes('1 Day')) durationDays = 1;
  else if (duration.includes('3 Days')) durationDays = 3;
  else if (duration.includes('7 Days')) durationDays = 7;
  else if (duration.includes('30 Days')) durationDays = 30;
  else if (duration.includes('90 Days')) durationDays = 90;
  else if (duration.includes('Lifetime')) durationDays = 0;

  try {
    const res = await fetch(`${API_BASE_URL}/api/keys/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationDays, count, note }),
    });
    if (res.ok) {
      const data = await res.json();
      const createdKeys: KeyItem[] = (data.keys || []).map((k: any) => ({
        id: k.id || k.key,
        key: k.key,
        status: k.status || 'active',
        hwid: k.hwid || null,
        duration: k.expiresAt === 'never' ? 'Lifetime' : `${durationDays} Days`,
        createdAt: k.createdAt || new Date().toISOString(),
        expiresAt: k.expiresAt === 'never' ? null : k.expiresAt,
        note: k.note || '',
      }));
      return {
        newKeys: createdKeys,
        generatedStrings: createdKeys.map((k) => k.key),
      };
    }
  } catch (e) {
    console.warn("Backend API offline, generating locally.");
  }

  // Fallback local key generation logic
  const generated: KeyItem[] = [];
  const generatedStrings: string[] = [];

  for (let i = 0; i < count; i++) {
    const randomHex = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    const keyStr = `AXIOS-${randomHex()}-${randomHex()}-${randomHex()}`;

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
      createdAt: new Date().toISOString(),
      expiresAt,
      note: note || 'Panel Generated',
    };

    generated.push(newItem);
    generatedStrings.push(keyStr);
  }

  localKeysStore = [...generated, ...localKeysStore];
  return { newKeys: generated, generatedStrings };
}

export async function resetHwidApi(keyId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/keys/reset-hwid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: keyId }),
    });
    if (res.ok) return true;
  } catch (e) {
    console.warn("Backend API offline, resetting HWID locally.");
  }

  localKeysStore = localKeysStore.map((k) =>
    k.id === keyId ? { ...k, hwid: null } : k
  );
  return true;
}

export async function deleteKeyApi(keyId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/keys/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: keyId }),
    });
    if (res.ok) return true;
  } catch (e) {
    console.warn("Backend API offline, deleting locally.");
  }

  localKeysStore = localKeysStore.filter((k) => k.id !== keyId);
  return true;
}

