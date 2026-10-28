import { MAX_TAILORED, TailorOverlay } from "../../content/tailor";
import { iso, isUniqueViolation, type Db } from "../db/types";

/** A person's saved tailored CVs (at most three) and the one-step undo for applying a version to their page. */

export type TailoredRecord = {
  id: string;
  slot: number;
  name: string;
  jobTitle: string;
  jobCompany: string;
  jobSource: string;
  overlay: TailorOverlay;
  createdAt: string;
  updatedAt: string;
};

export type NewTailored = Pick<TailoredRecord, "id" | "name" | "jobTitle" | "jobCompany" | "jobSource" | "overlay">;
export type UndoRecord = { label: string; snapshot: TailorOverlay; takenAt: string };

export interface TailoredStore {
  /** In slot order. A row whose overlay no longer reads is left out rather than breaking the page. */
  list(slug: string): Promise<TailoredRecord[]>;
  get(slug: string, id: string): Promise<TailoredRecord | null>;
  /** "full" when all three slots are taken. */
  add(slug: string, rec: NewTailored, now: Date): Promise<TailoredRecord | "full">;
  /** False when there is no such version on this page. */
  update(slug: string, id: string, patch: Pick<TailoredRecord, "name" | "overlay">, now: Date): Promise<boolean>;
  remove(slug: string, id: string): Promise<boolean>;
  getUndo(slug: string): Promise<UndoRecord | null>;
  setUndo(slug: string, undo: UndoRecord): Promise<void>;
  clearUndo(slug: string): Promise<void>;
}

type Row = {
  id: string;
  slot: number;
  name: string;
  job_title: string;
  job_company: string;
  job_source: string;
  overlay: unknown;
  created_at: unknown;
  updated_at: unknown;
};

const COLUMNS = "id, slot, name, job_title, job_company, job_source, overlay, created_at, updated_at";

function toRecord(r: Row): TailoredRecord | null {
  const overlay = TailorOverlay.safeParse(r.overlay);
  if (!overlay.success) {
    console.error(`[tailored] saved version ${r.id} no longer reads; leaving it out`);
    return null;
  }
  return {
    id: r.id,
    slot: Number(r.slot),
    name: r.name,
    jobTitle: r.job_title,
    jobCompany: r.job_company,
    jobSource: r.job_source,
    overlay: overlay.data,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

export function tailoredStore(db: () => Db): TailoredStore {
  const list = async (slug: string) =>
    (await db().query<Row>(`select ${COLUMNS} from tailored_cvs where slug = $1 order by slot`, [slug]))
      .map(toRecord)
      .filter((r): r is TailoredRecord => r !== null);

  return {
    list,
    async get(slug, id) {
      const rows = await db().query<Row>(`select ${COLUMNS} from tailored_cvs where slug = $1 and id = $2`, [slug, id]);
      return rows[0] ? toRecord(rows[0]) : null;
    },
    async add(slug, rec, now) {
      // The slot is the limit: (slug, slot) is unique, so two saves at once cannot both take the last free one.
      for (let attempt = 0; attempt < 2; attempt++) {
        const rows = await db().query<{ slot: number }>("select slot from tailored_cvs where slug = $1", [slug]);
        const taken = new Set(rows.map((r) => Number(r.slot)));
        const slot = Array.from({ length: MAX_TAILORED }, (_, i) => i + 1).find((s) => !taken.has(s));
        if (slot === undefined) return "full";
        try {
          await db().query(
            `insert into tailored_cvs (id, slug, slot, name, job_title, job_company, job_source, overlay, created_at, updated_at)
             values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $9)`,
            [
              rec.id,
              slug,
              slot,
              rec.name,
              rec.jobTitle,
              rec.jobCompany,
              rec.jobSource,
              JSON.stringify(rec.overlay),
              now.toISOString(),
            ],
          );
          return {
            ...rec,
            slot,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };
        } catch (err) {
          if (!isUniqueViolation(err, "tailored_cvs_slot_key")) throw err;
        }
      }
      return "full";
    },
    async update(slug, id, patch, now) {
      const rows = await db().query<{ id: string }>(
        `update tailored_cvs set name = $3, overlay = $4::jsonb, updated_at = $5 where slug = $1 and id = $2 returning id`,
        [slug, id, patch.name, JSON.stringify(patch.overlay), now.toISOString()],
      );
      return rows.length > 0;
    },
    async remove(slug, id) {
      const rows = await db().query<{ id: string }>(
        "delete from tailored_cvs where slug = $1 and id = $2 returning id",
        [slug, id],
      );
      return rows.length > 0;
    },
    async getUndo(slug) {
      const rows = await db().query<{ label: string; snapshot: unknown; taken_at: unknown }>(
        "select label, snapshot, taken_at from tailored_undo where slug = $1",
        [slug],
      );
      const row = rows[0];
      if (!row) return null;
      const snapshot = TailorOverlay.safeParse(row.snapshot);
      return snapshot.success ? { label: row.label, snapshot: snapshot.data, takenAt: iso(row.taken_at) } : null;
    },
    async setUndo(slug, undo) {
      await db().query(
        `insert into tailored_undo (slug, label, snapshot, taken_at) values ($1, $2, $3::jsonb, $4)
         on conflict (slug) do update set label = excluded.label, snapshot = excluded.snapshot, taken_at = excluded.taken_at`,
        [slug, undo.label, JSON.stringify(undo.snapshot), undo.takenAt],
      );
    },
    async clearUndo(slug) {
      await db().query("delete from tailored_undo where slug = $1", [slug]);
    },
  };
}
