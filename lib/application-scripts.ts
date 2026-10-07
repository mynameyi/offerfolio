import "server-only";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

export type ApplicationScript = {
  id: string;
  roleTitle: string;
  company: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationScriptInput = Pick<ApplicationScript, "roleTitle" | "company" | "content">;

type ScriptRow = {
  id: string;
  roleTitle: string;
  company: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export function listApplicationScripts(): ApplicationScript[] {
  return db.prepare(`
    SELECT id, role_title AS roleTitle, company, content,
      created_at AS createdAt, updated_at AS updatedAt
    FROM application_scripts
    ORDER BY updated_at DESC, created_at DESC
  `).all() as ScriptRow[];
}

export function createApplicationScript(input: ApplicationScriptInput): ApplicationScript {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const script = {
    id,
    roleTitle: input.roleTitle.trim(),
    company: input.company.trim(),
    content: input.content.trim(),
    createdAt,
    updatedAt: createdAt,
  };
  db.prepare(`
    INSERT INTO application_scripts (id, role_title, company, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(script.id, script.roleTitle, script.company, script.content, script.createdAt, script.updatedAt);
  return script;
}

export function updateApplicationScript(id: string, input: ApplicationScriptInput): boolean {
  return db.prepare(`
    UPDATE application_scripts
    SET role_title = ?, company = ?, content = ?, updated_at = ?
    WHERE id = ?
  `).run(input.roleTitle.trim(), input.company.trim(), input.content.trim(), new Date().toISOString(), id).changes > 0;
}

export function deleteApplicationScript(id: string): boolean {
  return db.prepare("DELETE FROM application_scripts WHERE id = ?").run(id).changes > 0;
}
