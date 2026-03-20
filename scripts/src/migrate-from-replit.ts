/**
 * Migrates data from the Replit-hosted app into the current database.
 * Run with: DATABASE_URL=<your-db-url> pnpm --filter @workspace/scripts tsx src/migrate-from-replit.ts
 */

import pg from "pg";

const REPLIT_BASE = "https://badminton-score-tracker--parthhshah171.replit.app";
const { Client } = pg;

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("Set DATABASE_URL before running this script.");
    process.exit(1);
  }

  console.log("Fetching data from Replit...");
  const [playersRes, matchesRes] = await Promise.all([
    fetch(`${REPLIT_BASE}/api/players`),
    fetch(`${REPLIT_BASE}/api/matches?limit=1000`),
  ]);

  const players: any[] = await playersRes.json();
  const matches: any[] = await matchesRes.json();
  console.log(`Found ${players.length} players, ${matches.length} matches.`);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    // Clear existing data
    await client.query("DELETE FROM match_players");
    await client.query("DELETE FROM matches");
    await client.query("DELETE FROM players");

    // Insert players (preserve original IDs)
    for (const p of players) {
      await client.query(
        `INSERT INTO players (id, name, avatar_color, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.avatarColor, p.createdAt]
      );
    }
    // Reset sequence
    await client.query(`SELECT setval('players_id_seq', (SELECT MAX(id) FROM players))`);
    console.log(`Inserted ${players.length} players.`);

    // Insert matches and match_players
    for (const m of matches) {
      await client.query(
        `INSERT INTO matches (id, match_type, team1_score, team2_score, winner_team, notes, played_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [m.id, m.matchType, m.team1Score, m.team2Score, m.winnerTeam, m.notes ?? null, m.playedAt, m.createdAt]
      );
      for (const p of m.players) {
        await client.query(
          `INSERT INTO match_players (match_id, player_id, team)
           VALUES ($1, $2, $3)`,
          [m.id, p.playerId, p.team]
        );
      }
    }
    // Reset sequences
    await client.query(`SELECT setval('matches_id_seq', (SELECT MAX(id) FROM matches))`);
    await client.query(`SELECT setval('match_players_id_seq', (SELECT MAX(id) FROM match_players))`);
    console.log(`Inserted ${matches.length} matches.`);

    await client.query("COMMIT");
    console.log("Migration complete.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Migration failed, rolled back.", e);
  } finally {
    await client.end();
  }
}

main();
