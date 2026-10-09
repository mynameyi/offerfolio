import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const bundlePath = process.argv[2];
if (!bundlePath) throw new Error("Usage: node scripts/import-deploy-data.mjs <bundle.json>");

const payload = JSON.parse(await readFile(resolve(bundlePath), "utf8"));
if (payload?.format !== "offerfolio-deploy-data" || payload?.version !== 1) {
  throw new Error("Unsupported OfferFolio data bundle.");
}
if (!payload.portfolioProfile || !Array.isArray(payload.applicationScripts) || !Array.isArray(payload.shareLinks)) {
  throw new Error("The data bundle is incomplete.");
}

const databasePath = process.env.DATABASE_PATH || "/app/data/offerfolio.sqlite";
const database = new Database(databasePath);
database.pragma("foreign_keys = ON");

const result = database.transaction(() => {
  let profileChanged = 0;
  let scriptsChanged = 0;
  let scriptsRemoved = 0;
  let linksChanged = 0;
  let linksDisabled = 0;

  const profile = payload.portfolioProfile;
  const existingProfile = database.prepare("SELECT profile_json, updated_at FROM portfolio_profile WHERE id = 1").get();
  if (!existingProfile || existingProfile.profile_json !== profile.profile_json || existingProfile.updated_at !== profile.updated_at) {
    database.prepare(`
      INSERT INTO portfolio_profile (id, profile_json, updated_at) VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at
    `).run(profile.profile_json, profile.updated_at);
    profileChanged = 1;
  }

  const scriptIds = new Set(payload.applicationScripts.map((item) => item.id));
  const existingScriptIds = database.prepare("SELECT id FROM application_scripts").all();
  const removeScript = database.prepare("DELETE FROM application_scripts WHERE id = ?");
  for (const { id } of existingScriptIds) {
    if (!scriptIds.has(id)) scriptsRemoved += removeScript.run(id).changes;
  }
  const upsertScript = database.prepare(`
    INSERT INTO application_scripts (id, role_title, company, content, created_at, updated_at)
    VALUES (@id, @role_title, @company, @content, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      role_title = excluded.role_title,
      company = excluded.company,
      content = excluded.content,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
    WHERE application_scripts.role_title IS NOT excluded.role_title
      OR application_scripts.company IS NOT excluded.company
      OR application_scripts.content IS NOT excluded.content
      OR application_scripts.created_at IS NOT excluded.created_at
      OR application_scripts.updated_at IS NOT excluded.updated_at
  `);
  for (const item of payload.applicationScripts) scriptsChanged += upsertScript.run(item).changes;

  const localTokens = new Set(payload.shareLinks.map((item) => item.token));
  const upsertLink = database.prepare(`
    INSERT INTO share_links (token, label, created_at, active)
    VALUES (@token, @label, @created_at, @active)
    ON CONFLICT(token) DO UPDATE SET
      label = excluded.label,
      created_at = excluded.created_at,
      active = excluded.active
    WHERE share_links.label IS NOT excluded.label
      OR share_links.created_at IS NOT excluded.created_at
      OR share_links.active IS NOT excluded.active
  `);
  for (const item of payload.shareLinks) linksChanged += upsertLink.run(item).changes;

  // Keep remote link rows so existing visitor records retain their link association.
  // Links removed locally are disabled remotely instead of being deleted.
  const activeRemoteLinks = database.prepare("SELECT token FROM share_links WHERE active = 1").all();
  const disableLink = database.prepare("UPDATE share_links SET active = 0 WHERE token = ? AND active = 1");
  for (const { token } of activeRemoteLinks) {
    if (!localTokens.has(token)) linksDisabled += disableLink.run(token).changes;
  }

  return { profileChanged, scriptsChanged, scriptsRemoved, linksChanged, linksDisabled };
})();

database.close();
process.stdout.write(`${JSON.stringify({ ...result, visitorRecords: "preserved", visitorSettings: "preserved" })}\n`);
