const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function createDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA trusted_schema = OFF;
    PRAGMA secure_delete = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username_lookup TEXT NOT NULL UNIQUE,
      username_encrypted TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const statements = {
    insertUser: db.prepare(`
      INSERT INTO users (
        username_lookup,
        username_encrypted,
        password_hash,
        created_at
      ) VALUES (?, ?, ?, ?)
    `),
    selectUserByLookup: db.prepare(`
      SELECT id, username_lookup, username_encrypted, password_hash, created_at
      FROM users
      WHERE username_lookup = ?
    `),
    selectUserById: db.prepare(`
      SELECT id, username_lookup, username_encrypted, password_hash, created_at
      FROM users
      WHERE id = ?
    `),
  };

  return {
    createUser({ usernameLookup, usernameEncrypted, passwordHash }) {
      return statements.insertUser.run(
        usernameLookup,
        usernameEncrypted,
        passwordHash,
        new Date().toISOString(),
      );
    },
    findUserById(userId) {
      return statements.selectUserById.get(userId);
    },
    findUserByLookup(usernameLookup) {
      return statements.selectUserByLookup.get(usernameLookup);
    },
    close() {
      db.close();
    },
  };
}

module.exports = {
  createDatabase,
};

