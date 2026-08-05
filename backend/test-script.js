const http = require('http');
const crypto = require('crypto');

async function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
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
    
    // 5. /api/keys/generate
    res = await request('POST', '/api/keys/generate', { durationDays: 7, count: 1 }, { Authorization: `Bearer ${token}` });
    assert(res.status === 200, `/api/keys/generate - returns 200 (Got ${res.status})`);
    let generatedKeyStr = '';
    let generatedKeyId = '';
    if (res.data.keys && res.data.keys.length > 0) {
        generatedKeyStr = res.data.keys[0].key;
        generatedKeyId = res.data.keys[0].id;
    }
    assert(generatedKeyStr !== '', `/api/keys/generate - generated key string found`);
    
    // 6. /api/verify
    const timestamp = Date.now();
    const hwid = 'test-hwid-123';
    const payload = `${generatedKeyStr}${hwid}${timestamp}`;
    const secret = 'AXIOS_PAYLOAD_SECRET';
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    res = await request('POST', '/api/verify', { key: generatedKeyStr, hwid: hwid, timestamp: timestamp, signature: signature });
    assert(res.status === 200, `/api/verify - returns 200 for valid key (Got ${res.status})`);

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
