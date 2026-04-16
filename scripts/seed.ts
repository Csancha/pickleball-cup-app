/**
 * Script de seed para crear datos de prueba
 *
 * Uso: npx tsx scripts/seed.ts
 *
 * Crea:
 * - 1 admin (admin@pickleball.test / password123)
 * - 12 jugadores ficticios
 * - 1 torneo con configuración estándar (12 jugadores, 2 equipos, 3 pistas, 6 rondas)
 *
 * Requiere las variables de entorno NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Cargar .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Faltan variables de entorno. Copia .env.local.example a .env.local y rellénalo.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// DATOS DE PRUEBA
// ============================================================

const PLAYERS_TEAM_A = [
  "Carlos García", "Ana Martínez", "Luis Rodríguez",
  "María López", "Pedro Sánchez", "Laura Fernández",
];

const PLAYERS_TEAM_B = [
  "Miguel Torres", "Elena Díaz", "Antonio Ruiz",
  "Carmen Jiménez", "Francisco Moreno", "Isabel Navarro",
];

const TOURNAMENT_CONFIG = {
  name: "Copa Pickleball 2025 · Demo",
  total_players: 12,
  total_teams: 2,
  players_per_team: 6,
  total_courts: 3,
  players_per_match: 4,
  total_league_rounds: 6,
  match_duration_minutes: 15,
};

// ============================================================
// SEED PRINCIPAL
// ============================================================

async function seed() {
  console.log("🏓 Iniciando seed de Pickleball Cup...\n");

  // 1. Crear admin
  console.log("1. Creando usuario admin...");
  const { data: adminAuth, error: adminError } = await supabase.auth.admin.createUser({
    email: "admin@pickleball.test",
    password: "password123",
    user_metadata: { full_name: "Admin Torneo", role: "admin" },
    email_confirm: true,
  });

  if (adminError && !adminError.message.includes("already been registered")) {
    console.error("   ❌", adminError.message);
  } else {
    console.log("   ✅ admin@pickleball.test / password123");
  }

  // Asegurar perfil admin
  if (adminAuth?.user) {
    await supabase.from("profiles").upsert({
      id: adminAuth.user.id,
      email: "admin@pickleball.test",
      full_name: "Admin Torneo",
      role: "admin",
    });
  }

  // 2. Obtener ID del admin
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "admin@pickleball.test")
    .single();

  if (!adminProfile) {
    console.error("❌ No se pudo obtener el perfil admin");
    process.exit(1);
  }

  // 3. Crear torneo
  console.log("\n2. Creando torneo...");
  const { data: existingTournament } = await supabase
    .from("tournaments")
    .select("id")
    .eq("name", TOURNAMENT_CONFIG.name)
    .single();

  let tournamentId: string;

  if (existingTournament) {
    tournamentId = existingTournament.id;
    console.log(`   ✅ Torneo ya existe: ${tournamentId}`);
  } else {
    const { data: tournament, error: tError } = await supabase
      .from("tournaments")
      .insert({ ...TOURNAMENT_CONFIG, created_by: adminProfile.id })
      .select("id")
      .single();

    if (tError || !tournament) {
      console.error("   ❌", tError?.message);
      process.exit(1);
    }
    tournamentId = tournament.id;
    console.log(`   ✅ Torneo creado: ${tournamentId}`);
  }

  // 4. Obtener o crear equipos
  console.log("\n3. Configurando equipos...");
  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name")
    .eq("tournament_id", tournamentId);

  let teams = teamsData ?? [];

  if (teams.length < 2) {
    // Los equipos se crean automáticamente al crear el torneo
    // Renombrar
    const { data: freshTeams } = await supabase
      .from("teams")
      .select("id, name")
      .eq("tournament_id", tournamentId)
      .order("created_at");

    teams = freshTeams ?? [];
  }

  if (teams.length >= 2) {
    await supabase.from("teams").update({ name: "Equipo Verde", color: "#22c55e" }).eq("id", teams[0].id);
    await supabase.from("teams").update({ name: "Equipo Azul", color: "#3b82f6" }).eq("id", teams[1].id);
    console.log("   ✅ Equipo Verde y Equipo Azul");
  }

  const [teamA, teamB] = teams;

  // 5. Crear jugadores y asignarlos
  console.log("\n4. Creando jugadores...");

  const allPlayers = [
    ...PLAYERS_TEAM_A.map((name) => ({ name, teamId: teamA.id })),
    ...PLAYERS_TEAM_B.map((name) => ({ name, teamId: teamB.id })),
  ];

  let createdCount = 0;
  for (const p of allPlayers) {
    // Verificar si ya existe en tournament_players para este equipo
    const { data: existingPlayer } = await supabase
      .from("players")
      .select("id")
      .eq("display_name", p.name)
      .single();

    let playerId: string;

    if (existingPlayer) {
      playerId = existingPlayer.id;
    } else {
      const { data: newPlayer, error: pError } = await supabase
        .from("players")
        .insert({ display_name: p.name })
        .select("id")
        .single();

      if (pError || !newPlayer) {
        console.error(`   ❌ Error creando ${p.name}:`, pError?.message);
        continue;
      }
      playerId = newPlayer.id;
    }

    // Verificar si ya está asignado
    const { data: existingAssignment } = await supabase
      .from("tournament_players")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("player_id", playerId)
      .single();

    if (!existingAssignment) {
      const { error: tpError } = await supabase.from("tournament_players").insert({
        tournament_id: tournamentId,
        player_id: playerId,
        team_id: p.teamId,
      });

      if (tpError) {
        console.error(`   ❌ Error asignando ${p.name}:`, tpError.message);
        continue;
      }
    }

    createdCount++;
  }

  console.log(`   ✅ ${createdCount}/${allPlayers.length} jugadores creados y asignados`);

  // 6. Crear usuarios de prueba para jugadores (opcional)
  console.log("\n5. Creando usuarios de prueba para jugadores...");
  const PLAYER_EMAILS = [
    { email: "jugador1@pickleball.test", name: "Carlos García" },
    { email: "jugador2@pickleball.test", name: "Miguel Torres" },
  ];

  for (const pu of PLAYER_EMAILS) {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: pu.email,
      password: "password123",
      user_metadata: { full_name: pu.name, role: "jugador" },
      email_confirm: true,
    });

    if (authErr && !authErr.message.includes("already been registered")) {
      console.error(`   ❌ ${pu.email}:`, authErr.message);
      continue;
    }

    if (authData?.user) {
      // Vincular al player
      await supabase
        .from("players")
        .update({ profile_id: authData.user.id, is_registered: true })
        .eq("display_name", pu.name);
    }

    console.log(`   ✅ ${pu.email} / password123`);
  }

  // ============================================================
  // RESUMEN
  // ============================================================
  console.log("\n" + "=".repeat(50));
  console.log("✅ SEED COMPLETADO");
  console.log("=".repeat(50));
  console.log("\n📋 Credenciales de acceso:");
  console.log("\n  ADMIN:");
  console.log("    Email:    admin@pickleball.test");
  console.log("    Password: password123");
  console.log("\n  JUGADORES:");
  console.log("    jugador1@pickleball.test / password123 (Carlos García)");
  console.log("    jugador2@pickleball.test / password123 (Miguel Torres)");
  console.log("\n📊 Torneo creado:");
  console.log(`    ID: ${tournamentId}`);
  console.log(`    Nombre: ${TOURNAMENT_CONFIG.name}`);
  console.log(`    Estado: draft (listo para activar)`);
  console.log("\n🚀 Siguiente paso:");
  console.log("    1. Inicia sesión como admin");
  console.log("    2. Abre el torneo");
  console.log("    3. Actívalo con el botón 'Activar torneo'");
  console.log("    4. Genera las rondas con 'Generar rondas'");
  console.log("=".repeat(50) + "\n");
}

seed().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
