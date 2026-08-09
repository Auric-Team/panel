import { expect, test, describe, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:20067";

describe("AXIOS Key Management System - Direct Bun Backend Integration Tests", () => {
  let ownerToken: string = "";
  let resellerToken: string = "";
  let generatedTestKey: string = "";
  let testKeyId: string = "";
  let testResellerId: string = "";

  test("1. Server Status & Health Endpoints", async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("online");
    expect(data.engine).toContain("Bun Native");

    const healthRes = await fetch(`${BASE_URL}/api/stats`);
    expect(healthRes.status).toBe(200);
  });

  test("2. Owner Authentication & 2FA Flow", async () => {
    // Step 1: Login triggers 2FA
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "owner", password: "owner123" }),
    });
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.require2FA).toBe(true);
    expect(loginData.userId).toBeDefined();

    // Step 2: Verify 2FA PIN
    const verify2FARes = await fetch(`${BASE_URL}/api/auth/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: loginData.userId, pin: "123456" }),
    });
    expect(verify2FARes.status).toBe(200);
    const verifyData = await verify2FARes.json();
    expect(verifyData.token).toBeDefined();
    ownerToken = verifyData.token;
  });

  test("3. Get Keys List (Owner Scoped)", async () => {
    const res = await fetch(`${BASE_URL}/api/keys`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(res.status).toBe(200);
    const keys = await res.json();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBeGreaterThan(0);
  });

  test("4. Create New Reseller & Update Tokens", async () => {
    const testUsername = `reseller_test_${Date.now()}`;
    const createRes = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        username: testUsername,
        password: "password123",
        role: "reseller",
        tokens: 500,
      }),
    });
    expect(createRes.status).toBe(200);

    // Fetch users to get ID
    const usersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const users = await usersRes.json();
    const created = users.find((u: any) => u.username === testUsername);
    expect(created).toBeDefined();
    expect(created.tokens).toBe(500);
    testResellerId = created.id;

    // Reseller Login
    const rLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: testUsername, password: "password123" }),
    });
    const rData = await rLogin.json();
    expect(rData.token).toBeDefined();
    resellerToken = rData.token;

    // Update tokens (+200)
    const tokenRes = await fetch(`${BASE_URL}/api/users/update-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        userId: testResellerId,
        amount: 200,
        action: "add",
      }),
    });
    expect(tokenRes.status).toBe(200);
    const tokenData = await tokenRes.json();
    expect(tokenData.newBalance).toBe(700);
  });

  test("5. Reseller Key Generation with Token Deduction", async () => {
    const genRes = await fetch(`${BASE_URL}/api/keys/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resellerToken}`,
      },
      body: JSON.stringify({
        durationDays: 7, // 70 tokens cost
        count: 2,        // 140 tokens total
        note: "Automated Test Key",
      }),
    });
    expect(genRes.status).toBe(200);
    const genData = await genRes.json();
    expect(genData.success).toBe(true);
    expect(genData.keys.length).toBe(2);

    generatedTestKey = genData.keys[0].key;
    testKeyId = genData.keys[0].id;

    // Check reseller balance (700 - 140 = 560)
    const meUsersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const meUsers = await meUsersRes.json();
    const me = meUsers.find((u: any) => u.id === testResellerId);
    expect(me.tokens).toBe(560);
  });

  test("6. Public Key Verification & HWID Binding", async () => {
    const hwid = `TEST-HWID-${Date.now()}`;
    const verifyRes = await fetch(`${BASE_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: generatedTestKey,
        hwid,
      }),
    });
    expect(verifyRes.status).toBe(200);
    const vData = await verifyRes.json();
    expect(vData.status).toBe("authenticated");

    // Second verify with SAME HWID -> success
    const vRes2 = await fetch(`${BASE_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: generatedTestKey,
        hwid,
      }),
    });
    expect(vRes2.status).toBe(200);

    // Third verify with DIFFERENT HWID -> mismatch
    const vRes3 = await fetch(`${BASE_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: generatedTestKey,
        hwid: "DIFFERENT-HWID-9999",
      }),
    });
    expect(vRes3.status).toBe(403);
  });

  test("7. Reset HWID & Re-bind Device", async () => {
    const resetRes = await fetch(`${BASE_URL}/api/keys/reset-hwid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ id: testKeyId }),
    });
    expect(resetRes.status).toBe(200);

    // Now verify with new HWID -> success
    const newHwid = `NEW-HWID-BOUND-${Date.now()}`;
    const rebindRes = await fetch(`${BASE_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: generatedTestKey,
        hwid: newHwid,
      }),
    });
    expect(rebindRes.status).toBe(200);
  });

  test("8. Executive Analytics & Reseller Dashboard Drilldown", async () => {
    const analyticsRes = await fetch(`${BASE_URL}/api/analytics`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(analyticsRes.status).toBe(200);
    const aData = await analyticsRes.json();
    expect(aData.totalKeys).toBeGreaterThan(0);
    expect(aData.dailySales).toBeDefined();

    const resellerAnalyticsRes = await fetch(`${BASE_URL}/api/analytics/reseller/${testResellerId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(resellerAnalyticsRes.status).toBe(200);
    const rData = await resellerAnalyticsRes.json();
    expect(rData.resellerInfo).toBeDefined();
    expect(rData.stats.totalKeys).toBe(2);
  });

  test("9. Delete Key & Delete Test User Cleanup", async () => {
    const delKeyRes = await fetch(`${BASE_URL}/api/keys/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ id: testKeyId }),
    });
    expect(delKeyRes.status).toBe(200);

    const delUserRes = await fetch(`${BASE_URL}/api/users/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ userId: testResellerId }),
    });
    expect(delUserRes.status).toBe(200);
  });
});
