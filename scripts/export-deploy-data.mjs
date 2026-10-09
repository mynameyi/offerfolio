import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";

const outputPath = process.argv[2];
if (!outputPath) throw new Error("Usage: node scripts/export-deploy-data.mjs <output.json>");

const databasePath = resolve(process.cwd(), "data", "offerfolio.sqlite");
const database = new Database(databasePath, { readonly: true, fileMustExist: true });

try {
  const payload = database.transaction(() => ({
    format: "offerfolio-deploy-data",
    version: 1,
    exportedAt: new Date().toISOString(),
    portfolioProfile: database.prepare("SELECT id, profile_json, updated_at FROM portfolio_profile WHERE id = 1").get() ?? null,
    applicationScripts: database.prepare("SELECT id, role_title, company, content, created_at, updated_at FROM application_scripts ORDER BY id").all(),
    shareLinks: database.prepare("SELECT token, label, created_at, active FROM share_links ORDER BY token").all(),
    // Visitor-related app settings (currently retention policy) intentionally stay remote.
  }))();

  if (!payload.portfolioProfile) throw new Error("Local profile row was not found.");
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await writeFile(resolve(outputPath), `${JSON.stringify(payload)}\n`, "utf8");
  process.stdout.write(`Exported profile, ${payload.applicationScripts.length} application scripts, and ${payload.shareLinks.length} share links. Visitor tables were excluded.\n`);
} finally {
  database.close();
}
