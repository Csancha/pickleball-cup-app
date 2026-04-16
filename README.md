# Pickleball Cup App

Aplicación web para gestionar torneos de pickleball por equipos. Configurable, mobile-first y lista para despliegue en Vercel.

## Stack

- **Next.js 15** (App Router, Server Actions)
- **TypeScript** estricto
- **Tailwind CSS** mobile-first
- **Supabase** (Postgres + Auth + RLS)
- **Zod** para validación

---

## Inicio rápido

### 1. Clonar e instalar

```bash
cd pickleball-cup-app
npm install
```

### 2. Configurar Supabase

Crea un proyecto en [supabase.com](https://supabase.com), luego copia las credenciales:

```bash
cp .env.local.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Ejecutar el esquema SQL

En el **SQL Editor** de tu proyecto Supabase, ejecuta estos archivos en orden:

1. `sql/01_schema.sql` — Tablas, índices y restricciones
2. `sql/02_rls.sql` — Políticas RLS, triggers y función de perfil automático
3. `sql/03_functions.sql` — Funciones RPC auxiliares

### 4. Arrancar en local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### 5. Datos de prueba (opcional)

```bash
npm run db:seed
```

Crea:
- `admin@pickleball.test` / `password123` (rol admin)
- `jugador1@pickleball.test` / `password123` (Carlos García)
- `jugador2@pickleball.test` / `password123` (Miguel Torres)
- Torneo demo con 12 jugadores, 2 equipos, 3 pistas

---

## Flujo de uso

### Como Admin

1. **Registrarse** como "Administrador" en `/register`
2. **Crear torneo** en `/admin` → "Nuevo torneo"
   - Configura: nombre, jugadores, equipos, pistas, duración, rondas
3. **Añadir jugadores** en la pestaña "Jugadores" del torneo
4. **Activar torneo** (requiere todos los jugadores asignados)
5. **Generar rondas** (genera todas las rondas de liga automáticamente)
6. **Registrar resultados** en la pestaña "Rondas"
7. **Ver clasificaciones** en la pestaña "Clasificación"
8. **Generar fase final** (cuando todas las rondas de liga estén terminadas)
9. **Registrar resultados de la final**
10. **Determinar campeón**

### Como Jugador

1. **Registrarse** como "Jugador" en `/register`
2. **Ver dashboard** en `/dashboard`
3. **Consultar mis partidos**, equipo, clasificación y fase final

---

## Estructura del proyecto

```
pickleball-cup-app/
├── app/
│   ├── (admin)/admin/          # Páginas del admin
│   │   ├── page.tsx            # Dashboard admin
│   │   └── tournament/
│   │       ├── new/page.tsx    # Crear torneo
│   │       └── [id]/page.tsx   # Gestión del torneo
│   ├── (auth)/                 # Login y registro
│   ├── (player)/dashboard/     # Dashboard jugador
│   └── page.tsx                # Landing
│
├── components/
│   ├── admin/                  # Componentes del panel admin
│   │   ├── CreateTournamentForm.tsx
│   │   ├── TournamentAdminView.tsx
│   │   ├── PlayersManager.tsx
│   │   ├── RoundsView.tsx
│   │   ├── StandingsView.tsx
│   │   └── FinalsView.tsx
│   ├── auth/                   # Login y registro forms
│   └── player/                 # Vistas del jugador
│
├── lib/
│   ├── supabase/               # Clientes browser/server/middleware
│   ├── tournament/
│   │   └── actions.ts          # Server Actions principales
│   ├── standings/
│   │   └── calculator.ts       # Lógica de cálculo de standings
│   ├── pairing/
│   │   └── algorithm.ts        # Algoritmo de emparejamientos
│   ├── auth/
│   └── validations/            # Esquemas Zod
│
├── types/
│   ├── database.ts             # Tipos alineados con la BD
│   └── index.ts                # Tipos de dominio y helpers
│
├── sql/
│   ├── 01_schema.sql           # Esquema completo
│   ├── 02_rls.sql              # Políticas RLS y triggers
│   └── 03_functions.sql        # Funciones RPC
│
└── scripts/
    └── seed.ts                 # Datos de prueba
```

---

## Modelo de puntuación

### Fase liga

| Evento | Equipo | Jugador individual |
|--------|--------|--------------------|
| Puntos del marcador (ej. 14) | +14 | +14 |
| Bonus victoria | +3 | ❌ No cuenta |
| Empate | Sin bonus | Sin bonus |

**Total de equipo** = puntos_marcador + bonus

**Clasificación individual** = solo puntos del marcador (sin bonus)

### Desempate individual (por orden)

1. Más victorias
2. Mejor diferencia de puntos
3. Más puntos en la última ronda
4. Menos descansos
5. Ajuste manual por admin

---

## Algoritmo de emparejamientos

El generador (`lib/pairing/algorithm.ts`) funciona así:

### Selección de descansos (byes)

```
byesPerRound = totalPlayers - (totalCourts × 4)
```

Los jugadores con **menos descansos acumulados** descansan primero. En caso de empate, se elige aleatoriamente.

### Generación de parejas

Para cada pista disponible:

1. Seleccionar dos jugadores del mismo equipo como pareja
   - Score de pareja = penalización por haber jugado juntos antes (×10)
2. Seleccionar dos jugadores del equipo contrario como rivales
   - Score de rivales = penalización por haberse enfrentado antes (×5)
3. Minimizar el score total → mejores emparejamientos
4. Fallback: si no hay suficientes jugadores por equipo, mezclar disponibles

### Fase final

- Ordenar jugadores de cada equipo por ranking individual
- Formar parejas consecutivas: 1+2, 3+4, 5+6...
- Cada par del equipo A se enfrenta al par equivalente del equipo B
- El equipo con más victorias en la final es el campeón

---

## Parámetros configurables por torneo

| Parámetro | Descripción |
|-----------|-------------|
| `name` | Nombre del torneo |
| `total_players` | Número total de jugadores |
| `total_teams` | Número de equipos |
| `players_per_team` | Jugadores por equipo |
| `total_courts` | Pistas disponibles |
| `match_duration_minutes` | Duración de cada partido |
| `total_league_rounds` | Rondas de la fase liga |
| `players_per_match` | Fijo: 4 (2 vs 2) |

**Restricción**: `total_players = total_teams × players_per_team`

**`simultaneous_players`** se calcula automáticamente: `total_courts × players_per_match`

---

## Despliegue en Vercel

1. Sube el proyecto a GitHub
2. Importa en [vercel.com](https://vercel.com)
3. Añade las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (tu dominio de Vercel)
4. Deploy

---

## Limitaciones conocidas / Trabajo futuro

### Fase final para más de 2 equipos

La lógica actual está **completamente implementada para 2 equipos**. Para torneos con 3+ equipos, la base de datos y el esquema están preparados, pero la generación de la fase final necesita una lógica de eliminatoria/grupos adicional.

El campo `total_teams` en `tournaments` y la tabla `team_standings` ya admiten N equipos. Lo que falta:

1. Diseñar el formato de la fase final para 3+ equipos (grupos, eliminatoria, etc.)
2. Implementar `generateFinalMatches` para N equipos en `lib/pairing/algorithm.ts`
3. Actualizar `closeLeagueAndGenerateFinals` en `lib/tournament/actions.ts`

### Otras mejoras posibles

- Tiempo real con Supabase Realtime (marcadores en vivo)
- Notificaciones cuando empieza una ronda
- Exportar clasificación a PDF/Excel
- Avatar de jugador con upload a Supabase Storage
- Historial de torneos por jugador
- Estadísticas avanzadas (head-to-head, racha, etc.)
