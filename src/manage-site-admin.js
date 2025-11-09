#!/usr/bin/env node

// yargs and hideBin imported below, only import once at the top

/**
 * Site Admin User Management Script for MongoDB
 *
 * Features:
 * - Create a new site admin user with a strong password
 * - Update password for an existing site admin user
 * - Secure password hashing (bcrypt)
 * - Robust error handling
 * - Help menu
 *
 * Usage:
 *   node manage-site-admin.js create --username <username> --email <email> --password <password>
 *   node manage-site-admin.js update-password --username <username> --password <newpassword>
 *   node manage-site-admin.js --help
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const readline = require('readline');

function promptPasswordTwice(
  prompt1 = 'Enter new password: ',
  prompt2 = 'Re-enter new password: ',
) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    rl.stdoutMuted = true;
    const passwords = [];
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) rl.output.write('*');
      else rl.output.write(stringToWrite);
    };
    rl.question(prompt1, (pw1) => {
      rl.stdoutMuted = true;
      rl.output.write('\n');
      rl.question(prompt2, (pw2) => {
        rl.output.write('\n');
        rl.close();
        if (pw1 !== pw2) {
          reject(new Error('Passwords do not match.'));
        } else if (!pw1) {
          reject(new Error('Password cannot be empty.'));
        } else {
          resolve(pw1);
        }
      });
    });
    rl.stdoutMuted = true;
  });
}

// Environment-aware MongoDB URI selection
function getMongoUri() {
  // Check if we're running inside a Docker container
  const isDocker =
    process.env.NODE_ENV === 'production' ||
    process.env.DOCKER_ENV === 'true' ||
    require('fs').existsSync('/.dockerenv');

  // Production/Docker: Use internal network
  // Development: Use localhost with port mapping
  if (isDocker) {
    return process.env.MONGO_URI || 'mongodb://mongo:27017/mixerdb';
  } else {
    return process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mixerdb';
  }
}

const MONGO_URI = getMongoUri();
const DB_NAME = process.env.DB_NAME || 'mixerdb';
const USERS_COLLECTION = 'users';

console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 MongoDB URI: ${MONGO_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

async function createAdmin({ username, email, password }) {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const users = db.collection(USERS_COLLECTION);

    const existing = await users.findOne({ username });
    if (existing) {
      console.error('Error: User with that username already exists.');
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);
    const user = {
      username,
      email,
      passwordHash,
      familyId: new ObjectId(), // Not used for site admin, but required by schema
      roles: ['admin'],
      permissions: {
        isAdmin: true,
        isSiteAdmin: true,
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(user);
    console.log(`✅ Site admin user created successfully!`);
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${result.insertedId}`);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

async function resetPassword({ username }) {
  requireRoot();
  let password;
  try {
    password = await promptPasswordTwice();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const users = db.collection(USERS_COLLECTION);
    const user = await users.findOne({ username });
    if (!user) {
      console.error('Error: User not found.');
      process.exit(1);
    }
    const passwordHash = await hashPassword(password);
    await users.updateOne({ username }, { $set: { passwordHash, updatedAt: new Date() } });
    // Log the reset event
    console.log(
      `Password for user '${username}' reset successfully at ${new Date().toISOString()} (by root user ${process.env.SUDO_USER || process.env.USER || 'unknown'})`,
    );
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

async function updatePassword({ username, password }) {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const users = db.collection(USERS_COLLECTION);

    const existing = await users.findOne({ username });
    if (!existing) {
      console.error('Error: User not found.');
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);
    const result = await users.updateOne(
      { username },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount === 1) {
      console.log(`✅ Password updated successfully for user: ${username}`);
    } else {
      console.error('Error: Failed to update password.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error updating password:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

function requireRoot() {
  if (process.getuid && process.getuid() !== 0) {
    console.error('❌ This operation requires root privileges. Please run with sudo.');
    process.exit(1);
  }
}

yargs(hideBin(process.argv))
  .command(
    'create',
    'Create a new site admin user',
    (yargs) => {
      yargs
        .option('username', { demandOption: true, type: 'string' })
        .option('email', { demandOption: true, type: 'string' })
        .option('password', { demandOption: true, type: 'string' });
    },
    (argv) => createAdmin(argv),
  )
  .command(
    'update-password',
    'Update password for an existing site admin user',
    (yargs) => {
      yargs
        .option('username', { demandOption: true, type: 'string' })
        .option('password', { demandOption: true, type: 'string' });
    },
    (argv) => updatePassword(argv),
  )
  .command(
    'reset-password',
    'Reset password for a site admin user (requires sudo/root, prompts for new password twice)',
    (yargs) => {
      yargs.option('username', { demandOption: true, type: 'string' });
    },
    (argv) => resetPassword(argv),
  )
  .help()
  .alias('help', 'h')
  .demandCommand(1, 'You need to specify a command.')
  .strict().argv;
