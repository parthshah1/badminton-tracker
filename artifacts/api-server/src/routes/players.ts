import { db, playersTable, matchesTable, matchPlayersTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/players", async (_req, res) => {
  try {
    const players = await db.select().from(playersTable).orderBy(playersTable.name);
    res.json(players.map(p => ({
      id: p.id,
      name: p.name,
      avatarColor: p.avatarColor,
      createdAt: p.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

router.post("/players", async (req, res) => {
  try {
    const { name, avatarColor } = req.body;
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [player] = await db.insert(playersTable).values({
      name: name.trim(),
      avatarColor: avatarColor || "#3B82F6",
    }).returning();
    res.status(201).json({
      id: player.id,
      name: player.name,
      avatarColor: player.avatarColor,
      createdAt: player.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create player" });
  }
});

router.get("/players/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    res.json({
      id: player.id,
      name: player.name,
      avatarColor: player.avatarColor,
      createdAt: player.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch player" });
  }
});

router.patch("/players/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, avatarColor } = req.body;
    const updates: Record<string, string> = {};
    if (name && typeof name === "string") updates.name = name.trim();
    if (avatarColor && typeof avatarColor === "string") updates.avatarColor = avatarColor;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }
    const [player] = await db.update(playersTable).set(updates).where(eq(playersTable.id, id)).returning();
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    res.json({
      id: player.id,
      name: player.name,
      avatarColor: player.avatarColor,
      createdAt: player.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update player" });
  }
});

router.delete("/players/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Remove match participations first (cascade should handle, but be explicit)
    await db.delete(matchPlayersTable).where(eq(matchPlayersTable.playerId, id));
    await db.delete(playersTable).where(eq(playersTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete player" });
  }
});

router.get("/players/:id/stats", async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);

    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, playerId));
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const matchParticipations = await db
      .select({
        matchId: matchPlayersTable.matchId,
        team: matchPlayersTable.team,
        matchType: matchesTable.matchType,
        winnerTeam: matchesTable.winnerTeam,
        team1Score: matchesTable.team1Score,
        team2Score: matchesTable.team2Score,
        playedAt: matchesTable.playedAt,
      })
      .from(matchPlayersTable)
      .innerJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
      .where(eq(matchPlayersTable.playerId, playerId))
      .orderBy(desc(matchesTable.playedAt));

    let wins = 0, losses = 0, singlesWins = 0, singlesLosses = 0, doublesWins = 0, doublesLosses = 0;
    let currentWinStreak = 0, longestWinStreak = 0, tempStreak = 0;

    for (const m of matchParticipations) {
      const won = m.team === m.winnerTeam;
      if (won) {
        wins++;
        if (m.matchType === "singles") singlesWins++;
        else doublesWins++;
      } else {
        losses++;
        if (m.matchType === "singles") singlesLosses++;
        else doublesLosses++;
      }
    }

    // Calculate streaks from newest to oldest
    let streakBroken = false;
    for (const m of matchParticipations) {
      const won = m.team === m.winnerTeam;
      if (!streakBroken) {
        if (won) currentWinStreak++;
        else streakBroken = true;
      }
    }

    // Calculate longest streak
    for (const m of [...matchParticipations].reverse()) {
      const won = m.team === m.winnerTeam;
      if (won) {
        tempStreak++;
        if (tempStreak > longestWinStreak) longestWinStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? wins / totalMatches : 0;

    // Get recent matches with full details
    const recentMatchIds = matchParticipations.slice(0, 5).map(m => m.matchId);
    const recentMatches = await getMatchesWithPlayers(recentMatchIds);

    res.json({
      playerId,
      playerName: player.name,
      totalMatches,
      wins,
      losses,
      winRate,
      singlesWins,
      singlesLosses,
      doublesWins,
      doublesLosses,
      currentWinStreak,
      longestWinStreak,
      recentMatches,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch player stats" });
  }
});

async function getMatchesWithPlayers(matchIds: number[]) {
  if (matchIds.length === 0) return [];
  const allPlayers = await db.select().from(playersTable);
  const playerMap = new Map(allPlayers.map(p => [p.id, p]));

  const results = [];
  for (const matchId of matchIds) {
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId));
    if (!match) continue;
    const participants = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, matchId));
    results.push({
      id: match.id,
      matchType: match.matchType,
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      winnerTeam: match.winnerTeam,
      notes: match.notes,
      playedAt: match.playedAt.toISOString(),
      createdAt: match.createdAt.toISOString(),
      players: participants.map(p => {
        const player = playerMap.get(p.playerId);
        return {
          playerId: p.playerId,
          playerName: player?.name ?? "Unknown",
          avatarColor: player?.avatarColor ?? "#3B82F6",
          team: p.team,
        };
      }),
    });
  }
  return results;
}

export { getMatchesWithPlayers };
export default router;
