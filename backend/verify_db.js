const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'axios.db');
console.log(`Connecting to database at ${dbPath}`);

const db = new Database(dbPath, { readonly: true });

try {
    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n--- TABLES ---');
    console.table(tables);

    // Check users
    const users = db.prepare("SELECT id, username, role FROM users").all();
    console.log('\n--- USERS ---');
    console.table(users);

    // Check keys
    const keysCount = db.prepare("SELECT COUNT(*) as count FROM keys").get();
    console.log(`\n--- KEYS ---`);
    console.log(`Total Keys: ${keysCount.count}`);
    
    // Check key types/status (just to get a summary)
    const keys = db.prepare("SELECT id, key_string, duration, status, created_by FROM keys LIMIT 5").all();
    console.log('Sample Keys (first 5):');
    console.table(keys);

    // Check audit logs
    const logsCount = db.prepare("SELECT COUNT(*) as count FROM audit_logs").get();
    console.log(`\n--- AUDIT LOGS ---`);
    console.log(`Total Logs: ${logsCount.count}`);

} catch (err) {
    console.error('Error querying database:', err);
} finally {
    db.close();
}
