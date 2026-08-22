import { expect, test, describe, beforeAll } from "bun:test";
import { app, initDatabase } from "./src/index";
import { ENV } from "./src/config/env";

const BASE_URL = `http://localhost:${ENV.PORT}`;

describe("AXIOS Key Management System - Direct Bun Backend Integration Tests", () => {
  let ownerToken: string = "";
  let resellerToken: string = "";
  let reseller2Token: string = "";
  let generatedTestKey: string = "";
  let testKeyId: string = "";
  let testResellerId: string = "";
  let testReseller2Id: string = "";
  let reseller2KeyId: string = "";
  let reseller2KeyStr: string = "";

  beforeAll(async () => {
    initDatabase();
    try {
      await new Promise<void>((resolve) => {
        app.listen(ENV.PORT, () => {
          resolve();
        });
      });
    } catch {
      // Server might already be running on port
    }
  });

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
  });

  test("4. Create New Resellers & Update Tokens", async () => {
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

    // Reseller 1 Login
    const rLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: testUsername, password: "password123" }),
    });
    const rData = await rLogin.json();
    expect(rData.token).toBeDefined();
    resellerToken = rData.token;

    // Create Reseller 2 for cross-user isolation testing
    const testUsername2 = `reseller2_test_${Date.now()}`;
    const createRes2 = await fetch(`${BASE_URL}/api/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        username: testUsername2,
        password: "password123",
        role: "reseller",
        tokens: 500,
      }),
    });
    expect(createRes2.status).toBe(200);
    const users2 = await (await fetch(`${BASE_URL}/api/users`, { headers: { Authorization: `Bearer ${ownerToken}` } })).json();
    const created2 = users2.find((u: any) => u.username === testUsername2);
    testReseller2Id = created2.id;

    const rLogin2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: testUsername2, password: "password123" }),
    });
    reseller2Token = (await rLogin2.json()).token;

    // Update tokens for Reseller 1 (+200 -> 700)
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

  test("4b. Verify Reseller with 0 keys sees 0 keys (Never falls back to all keys)", async () => {
    const res = await fetch(`${BASE_URL}/api/keys`, {
      headers: { Authorization: `Bearer ${resellerToken}` },
    });
    expect(res.status).toBe(200);
    const keys = await res.json();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBe(0);
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

    // Also generate 1 key for Reseller 2
    const genRes2 = await fetch(`${BASE_URL}/api/keys/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${reseller2Token}`,
      },
      body: JSON.stringify({
        durationDays: 1,
        count: 1,
        note: "Reseller 2 Private Key",
      }),
    });
    const genData2 = await genRes2.json();
    reseller2KeyId = genData2.keys[0].id;
    reseller2KeyStr = genData2.keys[0].key;
  });

  test("5b. Strict Reseller Key Isolation: Reseller only sees own keys", async () => {
    const r1Res = await fetch(`${BASE_URL}/api/keys`, {
      headers: { Authorization: `Bearer ${resellerToken}` },
    });
    const r1Keys = await r1Res.json();
    // Reseller 1 generated 2 keys in test 5
    expect(r1Keys.length).toBe(2);
    expect(r1Keys.every((k: any) => k.createdById === testResellerId)).toBe(true);
    expect(r1Keys.find((k: any) => k.id === reseller2KeyId)).toBeUndefined();

    const r2Res = await fetch(`${BASE_URL}/api/keys`, {
      headers: { Authorization: `Bearer ${reseller2Token}` },
    });
    const r2Keys = await r2Res.json();
    // Reseller 2 generated 1 key
    expect(r2Keys.length).toBe(1);
    expect(r2Keys[0].id).toBe(reseller2KeyId);
    expect(r2Keys.find((k: any) => k.id === testKeyId)).toBeUndefined();
  });

  test("5c. Cross-Reseller Unauthorized Access Checks (403 Forbidden)", async () => {
    // Reseller 1 attempts to reset HWID of Reseller 2's key -> 403
    const crossReset = await fetch(`${BASE_URL}/api/keys/reset-hwid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resellerToken}`,
      },
      body: JSON.stringify({ id: reseller2KeyId }),
    });
    expect(crossReset.status).toBe(403);

    // Reseller 1 attempts to delete Reseller 2's key -> 403
    const crossDelete = await fetch(`${BASE_URL}/api/keys/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resellerToken}`,
      },
      body: JSON.stringify({ id: reseller2KeyId }),
    });
    expect(crossDelete.status).toBe(403);

    // Reseller 1 attempts to extend Reseller 2's key -> 403
    const crossExtend = await fetch(`${BASE_URL}/api/keys/extend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resellerToken}`,
      },
      body: JSON.stringify({ id: reseller2KeyId, days: 3 }),
    });
    expect(crossExtend.status).toBe(403);

    // Reseller 1 attempts to update note on Reseller 2's key -> 403
    const crossNote = await fetch(`${BASE_URL}/api/keys/update-note`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resellerToken}`,
      },
      body: JSON.stringify({ id: reseller2KeyId, note: "Hacked note" }),
    });
    expect(crossNote.status).toBe(403);

    // Reseller 1 attempts to update receipt on Reseller 2's key -> 403
    const crossReceipt = await fetch(`${BASE_URL}/api/keys/upload-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resellerToken}`,
      },
      body: JSON.stringify({ id: reseller2KeyId, paymentScreenshot: "data:image/png;base64,123" }),
    });
    expect(crossReceipt.status).toBe(403);

    // Reseller 1 attempts to access Reseller 2's analytics -> 403
    const crossAnalytics = await fetch(`${BASE_URL}/api/analytics/reseller/${testReseller2Id}`, {
      headers: { Authorization: `Bearer ${resellerToken}` },
    });
    expect(crossAnalytics.status).toBe(403);
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
    expect(vRes3.status).toBe(200);
    const vData3 = await vRes3.json();
    expect(vData3.status).toBe("mismatch");
  });

  test("7. Reseller Reset HWID on Own Key", async () => {
    const resetRes = await fetch(`${BASE_URL}/api/keys/reset-hwid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resellerToken}`,
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

  test("8. Reseller Isolated Analytics", async () => {
    const analyticsRes = await fetch(`${BASE_URL}/api/analytics`, {
      headers: { Authorization: `Bearer ${resellerToken}` },
    });
    expect(analyticsRes.status).toBe(200);
    const aData = await analyticsRes.json();
    expect(aData.totalKeys).toBe(2);
    expect(aData.totalResellers).toBe(0); // Resellers do not manage other resellers
    expect(aData.topResellers.length).toBe(0); // Cannot see top resellers
    expect(aData.totalTokensSpent).toBe(140);
  });

  test("9. Reseller Isolated Audit Logs", async () => {
    const logsRes = await fetch(`${BASE_URL}/api/logs`, {
      headers: { Authorization: `Bearer ${resellerToken}` },
    });
    expect(logsRes.status).toBe(200);
    const logs = await logsRes.json();
    expect(Array.isArray(logs)).toBe(true);
    // All logs returned must belong exclusively to this reseller
    expect(logs.every((l: any) => l.userId === testResellerId || l.username.toLowerCase().includes("reseller_test"))).toBe(true);
  });

  test("10. Clean up test keys & test users", async () => {
    // Reseller 1 deletes own key
    const delKeyRes = await fetch(`${BASE_URL}/api/keys/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resellerToken}`,
      },
      body: JSON.stringify({ id: testKeyId }),
    });
    expect(delKeyRes.status).toBe(200);

    // Owner clean up
    await fetch(`${BASE_URL}/api/users/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ userId: testResellerId }),
    });

    await fetch(`${BASE_URL}/api/users/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ userId: testReseller2Id }),
    });
  });
});

