const http = require('http');
const crypto = require('crypto');

async function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port: process.env.PORT || 20067,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {
                    parsed = data;
                }
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log("Starting tests...");
    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
        if (condition) {
            console.log(`✅ ${message}`);
            passed++;
        } else {
            console.log(`❌ ${message}`);
            failed++;
        }
    };

    // 1. /api/auth/login
    let res = await request('POST', '/api/auth/login', { username: 'owner', password: 'owner123' });
    assert(res.status === 200, `/api/auth/login - valid login returns 200 (Got ${res.status})`);
    assert(res.data.require2FA === true, `/api/auth/login - requires 2FA for owner`);
    let userId = res.data.userId;

    res = await request('POST', '/api/auth/login', { username: 'owner', password: 'wrong' });
    assert(res.status === 401, `/api/auth/login - invalid login returns 401 (Got ${res.status})`);

    // 2. /api/auth/verify-2fa
    res = await request('POST', '/api/auth/verify-2fa', { userId: userId, pin: '123456' });
    assert(res.status === 200, `/api/auth/verify-2fa - valid 2fa returns 200 (Got ${res.status})`);
    assert(res.data.token, `/api/auth/verify-2fa - returns token`);
    let token = res.data.token;
    
    res = await request('POST', '/api/auth/verify-2fa', { userId: userId, pin: '000000' });
    assert(res.status === 401, `/api/auth/verify-2fa - invalid 2fa returns 401 (Got ${res.status})`);

    res = await request('POST', '/api/auth/verify-2fa', { userId: userId });
    assert(res.status === 400 || res.status === 401 || res.status === 403, `/api/auth/verify-2fa - missing pin returns 400/401/403 (Got ${res.status})`);

    // 3. /api/users
    res = await request('GET', '/api/users', null, { Authorization: `Bearer ${token}` });
    assert(res.status === 200, `/api/users - returns 200 (Got ${res.status})`);
    assert(Array.isArray(res.data) || Array.isArray(res.data.users), `/api/users - returns valid JSON array`);

    // 4. /api/keys
    res = await request('GET', '/api/keys', null, { Authorization: `Bearer ${token}` });
    assert(res.status === 200, `/api/keys - returns 200 (Got ${res.status})`);
    assert(Array.isArray(res.data), `/api/keys - returns valid JSON array`);
    
    // 5. /api/keys/generate (Standard Key with Custom Days e.g. 211 days)
    res = await request('POST', '/api/keys/generate', { durationDays: 211, count: 1 }, { Authorization: `Bearer ${token}` });
    assert(res.status === 200, `/api/keys/generate - returns 200 for 211 custom days (Got ${res.status})`);
    let generatedKeyStr = '';
    let generatedKeyId = '';
    if (res.data.keys && res.data.keys.length > 0) {
        generatedKeyStr = res.data.keys[0].key;
        generatedKeyId = res.data.keys[0].id;
    }
    assert(generatedKeyStr !== '', `/api/keys/generate - generated key string found`);

    // 5b. /api/keys/generate (Master Key with free-key-xxxx format)
    let masterRes = await request('POST', '/api/keys/generate', { durationDays: 4, count: 1, isMaster: true }, { Authorization: `Bearer ${token}` });
    assert(masterRes.status === 200, `/api/keys/generate - returns 200 for Master key with 4 custom days`);
    let masterKeyStr = masterRes.data.keys[0].key;
    assert(masterKeyStr.startsWith('free-key-'), `/api/keys/generate - master key format is free-key-xxxx (Got ${masterKeyStr})`);
    assert(masterKeyStr.length === 13, `/api/keys/generate - master key free-key-xxxx length is 13 (Got ${masterKeyStr})`);
    
    // 5c. Create Reseller User & Test Role Security
    const testResellerUser = `reseller_test_${Date.now()}`;
    const testResellerPass = 'pass123456';
    let createResellerRes = await request('POST', '/api/users/create', {
        username: testResellerUser,
        password: testResellerPass,
        role: 'reseller',
        credits: 100
    }, { Authorization: `Bearer ${token}` });
    assert(createResellerRes.status === 200, `/api/users/create - created reseller user ${testResellerUser}`);

    let resellerLoginRes = await request('POST', '/api/auth/login', { username: testResellerUser, password: testResellerPass });
    assert(resellerLoginRes.status === 200, `/api/auth/login - reseller login returns 200`);
    let resellerToken = resellerLoginRes.data.token;
    assert(resellerToken, `Reseller JWT token received`);

    // Reseller attempting Master Key creation -> MUST FAIL with 403
    let resellerMasterRes = await request('POST', '/api/keys/generate', { durationDays: 7, count: 1, isMaster: true }, { Authorization: `Bearer ${resellerToken}` });
    assert(resellerMasterRes.status === 403, `/api/keys/generate - Reseller blocked from creating Master Key (Got 403 Forbidden)`);

    // Reseller creating standard Custom Days Key (e.g., 15 days) -> MUST SUCCEED
    let resellerCustomRes = await request('POST', '/api/keys/generate', { durationDays: 15, count: 1, isMaster: false }, { Authorization: `Bearer ${resellerToken}` });
    assert(resellerCustomRes.status === 200, `/api/keys/generate - Reseller allowed to create 15 custom days key`);
    assert(resellerCustomRes.data.keys[0].key.startsWith('AXIOS-'), `Reseller key format is AXIOS-XXXX-XXXX-XXXX`);

    // 5d. Create Manager User & Test Manager Master Key Creation
    const testManagerUser = `manager_test_${Date.now()}`;
    const testManagerPass = 'pass654321';
    const testManagerPin = '654321';
    let createManagerRes = await request('POST', '/api/users/create', {
        username: testManagerUser,
        password: testManagerPass,
        role: 'manager',
        pin2fa: testManagerPin,
        credits: 500
    }, { Authorization: `Bearer ${token}` });
    assert(createManagerRes.status === 200, `/api/users/create - created manager user ${testManagerUser}`);

    let managerLoginRes = await request('POST', '/api/auth/login', { username: testManagerUser, password: testManagerPass });
    assert(managerLoginRes.status === 200, `/api/auth/login - manager login returns 200`);
    let managerUserId = managerLoginRes.data.userId;
    let manager2faRes = await request('POST', '/api/auth/verify-2fa', { userId: managerUserId, pin: testManagerPin });
    assert(manager2faRes.status === 200, `/api/auth/verify-2fa - manager 2FA login successful`);
    let managerToken = manager2faRes.data.token;

    // Manager creating Master Key -> MUST SUCCEED
    let managerMasterRes = await request('POST', '/api/keys/generate', { durationDays: 365, count: 1, isMaster: true }, { Authorization: `Bearer ${managerToken}` });
    assert(managerMasterRes.status === 200, `/api/keys/generate - Manager allowed to create Master Key for 365 custom days`);
    let managerMasterKey = managerMasterRes.data.keys[0].key;
    assert(managerMasterKey.startsWith('free-key-'), `Manager Master Key starts with free-key- (Got ${managerMasterKey})`);

    // 6. /api/verify
    const timestamp = Date.now();
    const hwid = 'test-hwid-123';
    const payload = `${generatedKeyStr}${hwid}${timestamp}`;
    const secret = 'AXIOS_PAYLOAD_SECRET';
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    res = await request('POST', '/api/verify', { key: generatedKeyStr, hwid: hwid, timestamp: timestamp, signature: signature });
    assert(res.status === 200, `/api/verify - returns 200 for valid key (Got ${res.status})`);

    // Standard key HWID mismatch test -> MUST FAIL with 403 mismatch
    const badHwidSig = crypto.createHmac('sha256', secret).update(`${generatedKeyStr}other-hwid-999${timestamp}`).digest('hex');
    let mismatchRes = await request('POST', '/api/verify', { key: generatedKeyStr, hwid: 'other-hwid-999', timestamp: timestamp, signature: badHwidSig });
    assert(mismatchRes.status === 403 && mismatchRes.data.status === 'mismatch', `/api/verify - Standard key correctly blocks mismatched HWID`);

    // 6b. Verify Master key works with multiple different HWIDs (Unlimited devices)
    const masterHwid1 = 'hwid-device-1';
    const masterHwid2 = 'hwid-device-2';
    const masterHwid3 = 'hwid-device-3';
    const masterSig1 = crypto.createHmac('sha256', secret).update(`${masterKeyStr}${masterHwid1}${timestamp}`).digest('hex');
    const masterSig2 = crypto.createHmac('sha256', secret).update(`${masterKeyStr}${masterHwid2}${timestamp}`).digest('hex');
    const masterSig3 = crypto.createHmac('sha256', secret).update(`${managerMasterKey}${masterHwid3}${timestamp}`).digest('hex');

    let v1 = await request('POST', '/api/verify', { key: masterKeyStr, hwid: masterHwid1, timestamp: timestamp, signature: masterSig1 });
    assert(v1.status === 200 && v1.data.status === 'authenticated', `/api/verify - Master key authenticates device 1`);

    let v2 = await request('POST', '/api/verify', { key: masterKeyStr, hwid: masterHwid2, timestamp: timestamp, signature: masterSig2 });
    assert(v2.status === 200 && v2.data.status === 'authenticated', `/api/verify - Master key authenticates device 2 (unlimited devices)`);

    let v3 = await request('POST', '/api/verify', { key: managerMasterKey, hwid: masterHwid3, timestamp: timestamp, signature: masterSig3 });
    assert(v3.status === 200 && v3.data.status === 'authenticated', `/api/verify - Manager Master key authenticates device 3 (unlimited devices)`);

    const badPayload = `invalid-key${hwid}${timestamp}`;
    const badSignature = crypto.createHmac('sha256', secret).update(badPayload).digest('hex');
    res = await request('POST', '/api/verify', { key: 'invalid-key', hwid: hwid, timestamp: timestamp, signature: badSignature });
    assert(res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404, `/api/verify - returns error for invalid key (Got ${res.status})`);

    // 7. /api/keys/reset-hwid
    res = await request('POST', '/api/keys/reset-hwid', { id: generatedKeyId }, { Authorization: `Bearer ${token}` });
    assert(res.status === 200, `/api/keys/reset-hwid - returns 200 (Got ${res.status})`);

    // 8. /api/keys/delete
    res = await request('POST', '/api/keys/delete', { id: generatedKeyId }, { Authorization: `Bearer ${token}` });
    assert(res.status === 200, `/api/keys/delete - returns 200 (Got ${res.status})`);

    // 9. /api/analytics
    res = await request('GET', '/api/analytics', null, { Authorization: `Bearer ${token}` });
    assert(res.status === 200, `/api/analytics - returns 200 (Got ${res.status})`);
    
    // Check missing auth routes
    res = await request('GET', '/api/users');
    assert(res.status === 401 || res.status === 403, `/api/users - returns 401/403 for missing auth (Got ${res.status})`);

    res = await request('GET', '/api/analytics');
    assert(res.status === 401 || res.status === 403, `/api/analytics - returns 401/403 for missing auth (Got ${res.status})`);

    console.log(`\nTests finished: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(console.error);
