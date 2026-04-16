#!/bin/bash
# ============================================================
# setup.sh — Configura y arranca Pickleball Cup App
# Uso: ./setup.sh
# ============================================================

set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m"

echo ""
echo -e "${BOLD}🏓 Pickleball Cup — Setup automático${NC}"
echo "=================================================="

# ── 1. Comprobar .env.local ──────────────────────────────────
if [ ! -f ".env.local" ]; then
  echo -e "${RED}✗ Falta .env.local${NC}"
  echo ""
  echo -e "  Cópialo con: ${BOLD}cp .env.local.example .env.local${NC}"
  echo "  Luego rellena NEXT_PUBLIC_SUPABASE_URL y las keys."
  exit 1
fi

SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2 | tr -d ' \r')
if [[ "$SUPABASE_URL" == *"your-project"* ]] || [ -z "$SUPABASE_URL" ]; then
  echo -e "${RED}✗ .env.local no tiene credenciales reales${NC}"
  echo ""
  echo "  Ve a https://supabase.com, crea un proyecto y copia:"
  echo "    NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co"
  echo "    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ..."
  echo "    SUPABASE_SERVICE_ROLE_KEY=eyJ..."
  exit 1
fi

echo -e "${GREEN}✓ .env.local encontrado${NC} → $SUPABASE_URL"

# ── 2. Instalar dependencias ─────────────────────────────────
echo ""
echo -e "${BLUE}▸ Instalando dependencias npm...${NC}"
npm install --legacy-peer-deps --silent

echo -e "${GREEN}✓ Dependencias instaladas${NC}"

# ── 3. Aplicar esquema SQL ───────────────────────────────────
echo ""
echo -e "${BLUE}▸ Aplicando esquema SQL en Supabase...${NC}"

SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2 | tr -d ' \r')

# Usar Supabase CLI para aplicar las migraciones
if command -v supabase &> /dev/null; then
  # Extraer project ref de la URL
  PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's/https:\/\///' | cut -d '.' -f1)
  echo "  Project ref: $PROJECT_REF"

  echo -e "  ${YELLOW}Ejecuta el SQL manualmente si falla el push automático${NC}"

  supabase db push \
    --db-url "postgresql://postgres:postgres@db.${PROJECT_REF}.supabase.co:5432/postgres" \
    2>&1 | tail -5 || \
  echo -e "  ${YELLOW}⚠ Push automático falló. Sigue el paso manual indicado más abajo.${NC}"
else
  echo -e "  ${YELLOW}supabase CLI no encontrado, saltando push automático${NC}"
fi

# ── 4. Crear seed de usuarios ────────────────────────────────
echo ""
echo -e "${BLUE}▸ Creando datos de prueba...${NC}"
npx tsx scripts/seed.ts 2>&1 || echo -e "  ${YELLOW}⚠ Seed falló (puede que ya existan los datos)${NC}"

# ── 5. Arrancar servidor ─────────────────────────────────────
echo ""
echo "=================================================="
echo -e "${GREEN}${BOLD}✓ Todo listo. Arrancando servidor...${NC}"
echo "=================================================="
echo ""
echo -e "  App:     ${BOLD}http://localhost:3000${NC}"
echo -e "  Admin:   ${BOLD}admin@pickleball.test${NC} / password123"
echo -e "  Jugador: ${BOLD}jugador1@pickleball.test${NC} / password123"
echo ""
npm run dev
