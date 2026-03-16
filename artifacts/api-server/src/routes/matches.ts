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

    if (!matchType || !team1PlayerIds || !team2PlayerIds) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const MAX_SCORE = 30;
    if (typeof team1Score !== "number" || typeof team2Score !== "number") {
      res.status(400).json({ error: "Scores must be numbers" });
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

    const winnerTeam = team1Score > team2Score ? 1 : 2;

    const [match] = await db.insert(matchesTable).values({
      matchType,
      team1Score: parseInt(team1Score),
      team2Score: parseInt(team2Score),
      winnerTeam,
      notes: notes || null,
      playedAt: new Date(playedAt),
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
