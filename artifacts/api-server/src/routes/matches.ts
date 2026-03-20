import { db, playersTable, matchesTable, matchPlayersTable } from "@workspace/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { recalculateAllElos } from "../lib/elo";

const router: IRouter = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

async function buildMatchResponse(matches: (typeof matchesTable.$inferSelect)[]) {
  if (matches.length === 0) return [];
  const allPlayers = await db.select().from(playersTable);
  const playerMap = new Map(allPlayers.map(p => [p.id, p]));

  const matchIds = matches.map(m => m.id);
  const allParticipants = await db
    .select()
    .from(matchPlayersTable)
    .where(inArray(matchPlayersTable.matchId, matchIds));

  const participantsByMatch = new Map<number, typeof allParticipants>();
  for (const mp of allParticipants) {
    if (!participantsByMatch.has(mp.matchId)) participantsByMatch.set(mp.matchId, []);
    participantsByMatch.get(mp.matchId)!.push(mp);
  }

  return matches.map(match => {
    const participants = participantsByMatch.get(match.id) ?? [];
    return {
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
    };
  });
}

// ─── GET /matches ────────────────────────────────────────────────────────────

router.get("/matches", async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "20"), 100);
    const offset = parseInt((req.query.offset as string) || "0");
    const matchTypeFilter = req.query.matchType as string | undefined;
    const playerIdFilter = req.query.playerId ? parseInt(req.query.playerId as string) : undefined;

    const matchTypeCondition =
      matchTypeFilter === "singles" || matchTypeFilter === "doubles"
        ? eq(matchesTable.matchType, matchTypeFilter)
        : undefined;

    let matchIdCondition: ReturnType<typeof inArray> | undefined;
    if (playerIdFilter && !isNaN(playerIdFilter)) {
      const rows = await db
        .select({ matchId: matchPlayersTable.matchId })
        .from(matchPlayersTable)
        .where(eq(matchPlayersTable.playerId, playerIdFilter));
      const ids = rows.map(r => r.matchId);
      if (ids.length === 0) {
        res.json([]);
        return;
      }
      matchIdCondition = inArray(matchesTable.id, ids);
    }

    const matches = await db
      .select()
      .from(matchesTable)
      .where(and(matchTypeCondition, matchIdCondition))
      .orderBy(desc(matchesTable.playedAt))
      .limit(limit)
      .offset(offset);

    const result = await buildMatchResponse(matches);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// ─── POST /matches ───────────────────────────────────────────────────────────

router.post("/matches", async (req, res) => {
  try {
    const { matchType, team1PlayerIds, team2PlayerIds, team1Score, team2Score, notes, playedAt } = req.body;

    const VALID_MATCH_TYPES = ["singles", "doubles"];
    if (!matchType || !VALID_MATCH_TYPES.includes(matchType)) {
      res.status(400).json({ error: "matchType must be 'singles' or 'doubles'" });
      return;
    }
    if (!Array.isArray(team1PlayerIds) || !Array.isArray(team2PlayerIds)) {
      res.status(400).json({ error: "Player lists must be arrays" });
      return;
    }
    const expectedCount = matchType === "singles" ? 1 : 2;
    if (team1PlayerIds.length !== expectedCount || team2PlayerIds.length !== expectedCount) {
      res.status(400).json({ error: `${matchType === "singles" ? "Singles" : "Doubles"} requires exactly ${expectedCount} player(s) per team` });
      return;
    }
    const allSubmittedIds = [...team1PlayerIds, ...team2PlayerIds];
    if (new Set(allSubmittedIds).size !== allSubmittedIds.length) {
      res.status(400).json({ error: "A player cannot be on both teams" });
      return;
    }
    const existingPlayers = await db.select({ id: playersTable.id }).from(playersTable).where(inArray(playersTable.id, allSubmittedIds));
    if (existingPlayers.length !== allSubmittedIds.length) {
      res.status(400).json({ error: "One or more player IDs do not exist" });
      return;
    }
    const MAX_SCORE = 30;
    if (typeof team1Score !== "number" || typeof team2Score !== "number") {
      res.status(400).json({ error: "Scores must be numbers" }); return;
    }
    if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score)) {
      res.status(400).json({ error: "Scores must be whole numbers" }); return;
    }
    if (team1Score < 0 || team2Score < 0) {
      res.status(400).json({ error: "Scores cannot be negative" }); return;
    }
    if (team1Score > MAX_SCORE || team2Score > MAX_SCORE) {
      res.status(400).json({ error: `Scores cannot exceed ${MAX_SCORE}` }); return;
    }
    if (team1Score === team2Score) {
      res.status(400).json({ error: "Scores cannot be tied" }); return;
    }
    if (notes && typeof notes === "string" && notes.length > 200) {
      res.status(400).json({ error: "Notes must be 200 characters or fewer" }); return;
    }

    let parsedDate = new Date();
    if (playedAt) {
      parsedDate = new Date(playedAt);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({ error: "Invalid date for playedAt" }); return;
      }
    }

    const winnerTeam = team1Score > team2Score ? 1 : 2;
    const [match] = await db.insert(matchesTable).values({
      matchType, team1Score, team2Score, winnerTeam, notes: notes || null, playedAt: parsedDate,
    }).returning();

    await db.insert(matchPlayersTable).values([
      ...team1PlayerIds.map((pid: number) => ({ matchId: match.id, playerId: pid, team: 1 })),
      ...team2PlayerIds.map((pid: number) => ({ matchId: match.id, playerId: pid, team: 2 })),
    ]);

    // Recalculate Elo for all players
    await recalculateAllElos();

    const [result] = await buildMatchResponse([match]);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create match" });
  }
});

// ─── GET /matches/:id ────────────────────────────────────────────────────────

router.get("/matches/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!match) { res.status(404).json({ error: "Match not found" }); return; }
    const [result] = await buildMatchResponse([match]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch match" });
  }
});

// ─── DELETE /matches/:id ─────────────────────────────────────────────────────

router.delete("/matches/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(matchesTable).where(eq(matchesTable.id, id));
    await recalculateAllElos();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete match" });
  }
});

// ─── GET /stats/teams ────────────────────────────────────────────────────────

router.get("/stats/teams", async (_req, res) => {
  try {
    const allPlayers = await db.select().from(playersTable);
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));

    const doublesMatches = await db.select().from(matchesTable).where(eq(matchesTable.matchType, "doubles"));
    if (doublesMatches.length === 0) { res.json([]); return; }

    const matchIds = doublesMatches.map(m => m.id);
    const allParticipants = await db.select().from(matchPlayersTable).where(inArray(matchPlayersTable.matchId, matchIds));

    const teamMap = new Map<string, { playerIds: number[]; wins: number; losses: number }>();

    for (const match of doublesMatches) {
      const participants = allParticipants.filter(p => p.matchId === match.id);
      const t1 = participants.filter(p => p.team === 1).map(p => p.playerId).sort((a, b) => a - b);
      const t2 = participants.filter(p => p.team === 2).map(p => p.playerId).sort((a, b) => a - b);
      if (t1.length !== 2 || t2.length !== 2) continue;

      const k1 = t1.join("-");
      const k2 = t2.join("-");
      if (!teamMap.has(k1)) teamMap.set(k1, { playerIds: t1, wins: 0, losses: 0 });
      if (!teamMap.has(k2)) teamMap.set(k2, { playerIds: t2, wins: 0, losses: 0 });

      if (match.winnerTeam === 1) {
        teamMap.get(k1)!.wins++;
        teamMap.get(k2)!.losses++;
      } else {
        teamMap.get(k1)!.losses++;
        teamMap.get(k2)!.wins++;
      }
    }

    const result = Array.from(teamMap.values())
      .map(team => {
        const total = team.wins + team.losses;
        return {
          key: team.playerIds.join("-"),
          players: team.playerIds.map(id => {
            const p = playerMap.get(id);
            return { playerId: id, playerName: p?.name ?? "Unknown", avatarColor: p?.avatarColor ?? "#3B82F6" };
          }),
          wins: team.wins,
          losses: team.losses,
          total,
          winRate: total > 0 ? team.wins / total : 0,
        };
      })
      .filter(t => t.total > 0)
      .sort((a, b) => b.winRate !== a.winRate ? b.winRate - a.winRate : b.total - a.total);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch team stats" });
  }
});

// ─── GET /stats/leaderboard ──────────────────────────────────────────────────

router.get("/stats/leaderboard", async (_req, res) => {
  try {
    const allPlayers = await db.select().from(playersTable);
    const allMatches = await db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt));
    const allParticipants = await db.select().from(matchPlayersTable);

    const leaderboard = allPlayers.map(player => {
      const participations = allParticipants.filter(p => p.playerId === player.id);
      const playerMatchIds = participations.map(p => p.matchId);
      const playerMatches = allMatches.filter(m => playerMatchIds.includes(m.id));
      // already sorted desc by playedAt from the outer query

      let wins = 0, losses = 0, currentWinStreak = 0;
      let streakBroken = false;

      for (const match of playerMatches) {
        const participation = participations.find(p => p.matchId === match.id);
        if (!participation) continue;
        const won = participation.team === match.winnerTeam;
        if (won) wins++; else losses++;
        if (!streakBroken) {
          if (won) currentWinStreak++;
          else streakBroken = true;
        }
      }

      const totalMatches = wins + losses;
      const winRate = totalMatches > 0 ? wins / totalMatches : 0;

      // Recent form: last 5 match results
      const recentForm = playerMatches.slice(0, 5).map(match => {
        const p = participations.find(x => x.matchId === match.id);
        return p && p.team === match.winnerTeam ? "W" : "L";
      });

      return {
        playerId: player.id,
        playerName: player.name,
        avatarColor: player.avatarColor,
        elo: player.elo,
        totalMatches,
        wins,
        losses,
        winRate,
        currentWinStreak,
        recentForm,
      };
    });

    leaderboard.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.totalMatches - a.totalMatches;
    });

    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
