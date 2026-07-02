import { randomUUID } from "node:crypto";
import { db, nowIso } from "./db";

type Row = Record<string, string | number | null>;

export function createRepo<T extends { id: string }>(table: string, columns: string[]) {
  const insertCols = columns.filter((c) => c !== "id" && c !== "created_at" && c !== "updated_at");

  function get(id: string): T | undefined {
    return db.prepare(`SELECT * FROM ${table} WHERE id = $id`).get({ $id: id }) as unknown as T | undefined;
  }

  return {
    list(orderBy = "created_at DESC"): T[] {
      return db.prepare(`SELECT * FROM ${table} ORDER BY ${orderBy}`).all() as unknown as T[];
    },
    listByContract(contractId: string, orderBy = "created_at DESC"): T[] {
      return db
        .prepare(`SELECT * FROM ${table} WHERE contract_id = $contract_id ORDER BY ${orderBy}`)
        .all({ $contract_id: contractId }) as unknown as T[];
    },
    get,
    create(data: Row): T {
      const id = randomUUID();
      const ts = nowIso();
      const allCols = ["id", ...insertCols, "created_at", "updated_at"];
      const placeholders = allCols.map((c) => `$${c}`).join(", ");
      const values: Row = { $id: id, $created_at: ts, $updated_at: ts };
      for (const c of insertCols) values[`$${c}`] = data[c] ?? null;
      db.prepare(`INSERT INTO ${table} (${allCols.join(", ")}) VALUES (${placeholders})`).run(values);
      return get(id) as T;
    },
    update(id: string, data: Row): T {
      const ts = nowIso();
      const setCols = insertCols.filter((c) => c in data);
      if (setCols.length === 0) return get(id) as T;
      const setSql = setCols.map((c) => `${c} = $${c}`).join(", ") + ", updated_at = $updated_at";
      const values: Row = { $id: id, $updated_at: ts };
      for (const c of setCols) values[`$${c}`] = data[c];
      db.prepare(`UPDATE ${table} SET ${setSql} WHERE id = $id`).run(values);
      return get(id) as T;
    },
    remove(id: string): void {
      db.prepare(`DELETE FROM ${table} WHERE id = $id`).run({ $id: id });
    },
  };
}
