import { db, playersTable, matchesTable, matchPlayersTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/matches", async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || "50");
    const offset = parseInt((req.query.offset as string) || "0");

    const matches = await db
      .select()
      .from(matchesTable)
      .orderBy(desc(matchesTable.playedAt))
      .limit(limit)
      .offset(offset);

    const allPlayers = await db.select().from(playersTable);
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));

    const result = await Promise.all(matches.map(async (match) => {
      const participants = await db
        .select()
        .from(matchPlayersTable)
        .where(eq(matchPlayersTable.matchId, match.id));

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
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

router.post("/matches", async (req, res) => {
  try {
    const {
      matchType,
      team1PlayerIds,
      team2PlayerIds,
      team1Score,
      team2Score,
      notes,
      playedAt,
    } = req.body;

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
      res.status(400).json({
        error: `${matchType === "singles" ? "Singles" : "Doubles"} requires exactly ${expectedCount} player(s) per team`,
      });
      return;
    }

    const allSubmittedIds = [...team1PlayerIds, ...team2PlayerIds];
    const uniqueIds = new Set(allSubmittedIds);
    if (uniqueIds.size !== allSubmittedIds.length) {
      res.status(400).json({ error: "A player cannot be on both teams" });
      return;
    }

    const existingPlayers = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(inArray(playersTable.id, allSubmittedIds));
    if (existingPlayers.length !== allSubmittedIds.length) {
      res.status(400).json({ error: "One or more player IDs do not exist" });
      return;
    }

    const MAX_SCORE = 30;
    if (typeof team1Score !== "number" || typeof team2Score !== "number") {
      res.status(400).json({ error: "Scores must be numbers" });
      return;
    }
    if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score)) {
      res.status(400).json({ error: "Scores must be whole numbers" });
      return;
    }
    if (team1Score < 0 || team2Score < 0) {
      res.status(400).json({ error: "Scores cannot be negative" });
      return;
    }
    if (team1Score > MAX_SCORE || team2Score > MAX_SCORE) {
      res.status(400).json({ error: `Scores cannot exceed ${MAX_SCORE}` });
      return;
    }
    if (team1Score === team2Score) {
      res.status(400).json({ error: "Scores cannot be tied" });
      return;
    }

    if (notes && typeof notes === "string" && notes.length > 200) {
      res.status(400).json({ error: "Notes must be 200 characters or fewer" });
      return;
    }

    let parsedDate = new Date();
    if (playedAt) {
      parsedDate = new Date(playedAt);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({ error: "Invalid date for playedAt" });
        return;
      }
    }

    const winnerTeam = team1Score > team2Score ? 1 : 2;

    const [match] = await db.insert(matchesTable).values({
      matchType,
      team1Score,
      team2Score,
      winnerTeam,
      notes: notes || null,
      playedAt: parsedDate,
    }).returning();

    const playerInserts = [
      ...team1PlayerIds.map((pid: number) => ({ matchId: match.id, playerId: pid, team: 1 })),
      ...team2PlayerIds.map((pid: number) => ({ matchId: match.id, playerId: pid, team: 2 })),
    ];

    await db.insert(matchPlayersTable).values(playerInserts);

    const allPlayers = await db.select().from(playersTable);
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));
    const participants = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, match.id));

    res.status(201).json({
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create match" });
  }
});

router.get("/matches/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    const allPlayers = await db.select().from(playersTable);
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));
    const participants = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, id));

    res.json({
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
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch match" });
  }
});

router.delete("/matches/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(matchesTable).where(eq(matchesTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete match" });
  }
});

router.get("/stats/teams", async (_req, res) => {
  try {
    const allPlayers = await db.select().from(playersTable);
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));

    const doublesMatches = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.matchType, "doubles"));

    if (doublesMatches.length === 0) {
      res.json([]);
      return;
    }

    const matchIds = doublesMatches.map(m => m.id);
    const allParticipants = await db
      .select()
      .from(matchPlayersTable)
      .where(inArray(matchPlayersTable.matchId, matchIds));

    const teamMap = new Map<string, { playerIds: number[]; wins: number; losses: number }>();

    for (const match of doublesMatches) {
      const participants = allParticipants.filter(p => p.matchId === match.id);
      const t1 = participants.filter(p => p.team === "team1").map(p => p.playerId).sort((a, b) => a - b);
      const t2 = participants.filter(p => p.team === "team2").map(p => p.playerId).sort((a, b) => a - b);
      if (t1.length !== 2 || t2.length !== 2) continue;

      const k1 = t1.join("-");
      const k2 = t2.join("-");
      if (!teamMap.has(k1)) teamMap.set(k1, { playerIds: t1, wins: 0, losses: 0 });
      if (!teamMap.has(k2)) teamMap.set(k2, { playerIds: t2, wins: 0, losses: 0 });

      if (match.winnerTeam === "team1") {
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

router.get("/stats/leaderboard", async (_req, res) => {
  try {
    const allPlayers = await db.select().from(playersTable);
    const allMatches = await db.select().from(matchesTable);
    const allParticipants = await db.select().from(matchPlayersTable);

    const leaderboard = allPlayers.map(player => {
      const participations = allParticipants.filter(p => p.playerId === player.id);
      let wins = 0, losses = 0, currentWinStreak = 0;

      // Sort by match playedAt desc for streak calculation
      const playerMatchIds = participations.map(p => p.matchId);
      const playerMatches = allMatches
        .filter(m => playerMatchIds.includes(m.id))
        .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());

      let streakBroken = false;
      for (const match of playerMatches) {
        const participation = participations.find(p => p.matchId === match.id);
        if (!participation) continue;
        const won = participation.team === match.winnerTeam;
        if (won) wins++;
        else losses++;
        if (!streakBroken) {
          if (won) currentWinStreak++;
          else streakBroken = true;
        }
      }

      const totalMatches = wins + losses;
      const winRate = totalMatches > 0 ? wins / totalMatches : 0;

      return {
        playerId: player.id,
        playerName: player.name,
        avatarColor: player.avatarColor,
        totalMatches,
        wins,
        losses,
        winRate,
        currentWinStreak,
      };
    });

    // Sort by win rate desc, then total matches desc
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
