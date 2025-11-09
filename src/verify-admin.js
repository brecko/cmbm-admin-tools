#!/usr/bin/env node
/**
 * Quick script to verify admin users in the database
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mixerdb';
const DB_NAME = 'mixerdb';
const USERS_COLLECTION = 'users';

(async () => {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const users = db.collection(USERS_COLLECTION);

    const adminUsers = await users
      .find({
        'permissions.isSiteAdmin': true,
      })
      .toArray();

    console.log('Site Admin Users Found:');
    adminUsers.forEach((user) => {
      console.log(`  - Username: ${user.username}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Roles: ${user.roles.join(', ')}`);
      console.log(`    Created: ${user.createdAt}`);
      console.log(`    Updated: ${user.updatedAt}`);
      console.log('');
    });

    if (adminUsers.length === 0) {
      console.log('  No site admin users found.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
})();
