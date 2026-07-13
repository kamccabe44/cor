// node:sqlite implementation of the core's data store. One file on disk
// holds all three logical "tables" as JSON blobs keyed the same way
// DynamoDB keys them, so the shared core logic in
// ../lambda/api/core.mjs runs unchanged.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function createSqliteStore(dbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS contracts (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS contractors (
      id TEXT PRIMARY KEY,
      contractId TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS contractors_by_contract ON contractors (contractId);
    CREATE TABLE IF NOT EXISTS ratings (
      targetKey TEXT NOT NULL,
      userSub TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (targetKey, userSub)
    );
  `);

  const parse = (row) => (row ? JSON.parse(row.data) : null);
  const parseAll = (rows) => rows.map((r) => JSON.parse(r.data));

  return {
    getContract(id) {
      return parse(db.prepare("SELECT data FROM contracts WHERE id = ?").get(id));
    },
    putContract(item) {
      db.prepare("INSERT OR REPLACE INTO contracts (id, data) VALUES (?, ?)").run(item.id, JSON.stringify(item));
    },
    deleteContract(id) {
      db.prepare("DELETE FROM contracts WHERE id = ?").run(id);
    },
    scanContracts() {
      return parseAll(db.prepare("SELECT data FROM contracts").all());
    },

    getContractor(id) {
      return parse(db.prepare("SELECT data FROM contractors WHERE id = ?").get(id));
    },
    putContractor(item) {
      db.prepare("INSERT OR REPLACE INTO contractors (id, contractId, data) VALUES (?, ?, ?)").run(
        item.id,
        item.contractId,
        JSON.stringify(item)
      );
    },
    deleteContractor(id) {
      db.prepare("DELETE FROM contractors WHERE id = ?").run(id);
    },
    queryContractorsByContract(contractId) {
      return parseAll(db.prepare("SELECT data FROM contractors WHERE contractId = ?").all(contractId));
    },

    getRating(targetKey, userSub) {
      return parse(db.prepare("SELECT data FROM ratings WHERE targetKey = ? AND userSub = ?").get(targetKey, userSub));
    },
    putRating(item) {
      db.prepare("INSERT OR REPLACE INTO ratings (targetKey, userSub, data) VALUES (?, ?, ?)").run(
        item.targetKey,
        item.userSub,
        JSON.stringify(item)
      );
    },
    queryRatingsByTarget(targetKey) {
      return parseAll(db.prepare("SELECT data FROM ratings WHERE targetKey = ?").all(targetKey));
    },
  };
}
