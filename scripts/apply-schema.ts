/**
 * apply-schema.ts
 * Aplica el esquema SQL directamente en Supabase vía REST API
 *
 * Uso: npx tsx scripts/apply-schema.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Las vars son opcionales para este script (solo genera el SQL)

// Para ejecutar SQL usamos el endpoint de Supabase Management API o el cliente directo
// Supabase JS client no ejecuta SQL arbitrario, pero podemos usar pg directamente
// Este script usa fetch contra el endpoint /rest/v1/rpc si hubiera una función,
// pero la forma más simple es usar la Supabase Management API.

// Como alternativa práctica, generamos un archivo SQL combinado que el usuario
// puede pegar directamente en el SQL Editor de Supabase.

const SQL_FILES = [
  "sql/01_schema.sql",
  "sql/02_rls.sql",
  "sql/03_functions.sql",
];

console.log("📋 Generando SQL combinado...\n");

let combined = `-- ============================================================
-- Pickleball Cup App — Schema completo
-- Pegar y ejecutar en Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================\n\n`;

for (const file of SQL_FILES) {
  const path = resolve(process.cwd(), file);
  const content = readFileSync(path, "utf-8");
  combined += `-- ──────────────────────────────────────────────────────\n`;
  combined += `-- FILE: ${file}\n`;
  combined += `-- ──────────────────────────────────────────────────────\n\n`;
  combined += content + "\n\n";
}

// Guardar en un archivo para fácil acceso
const outputPath = resolve(process.cwd(), "sql/combined_schema.sql");
const { writeFileSync } = require("fs");
writeFileSync(outputPath, combined);

console.log(`✅ SQL combinado guardado en: sql/combined_schema.sql`);
console.log("");
console.log("Pasos para aplicar:");
console.log("  1. Ve a https://supabase.com/dashboard/project/_/sql/new");
console.log("  2. Abre sql/combined_schema.sql");
console.log("  3. Copia y pega el contenido");
console.log("  4. Haz clic en 'Run'");
console.log("");
console.log("O usa el atajo: abre el archivo y cópialo con:");
console.log("  cat sql/combined_schema.sql | pbcopy");
