#!/usr/bin/env node
/**
 * MongoDB Connectivity Diagnostic Script
 *
 * Usage: node mongo-connect-test.js [mongodb_uri]
 *
 * Example: node mongo-connect-test.js mongodb://127.0.0.1:27017/mixerdb
 *
 * If no URI is provided, uses MONGO_URI env var or defaults to mongodb://127.0.0.1:27017/mixerdb
 */
import { MongoClient } from 'mongodb';

const uri = process.argv[2] || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mixerdb';

console.log('Testing MongoDB connection to:', uri);

(async () => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db();
    const admin = db.admin();
    const info = await admin.ping();
    console.log('✅ MongoDB connection successful! Ping result:', info);
    const dbs = await admin.listDatabases();
    console.log(
      'Databases:',
      dbs.databases.map((d) => d.name),
    );
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    if (err.reason) console.error('Reason:', err.reason);
    if (err.code) console.error('Error code:', err.code);
    if (err.stack) console.error('Stack:', err.stack);
  } finally {
    await client.close();
  }
})();
