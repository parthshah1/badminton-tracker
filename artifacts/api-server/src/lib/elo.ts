import { db, playersTable, matchesTable, matchPlayersTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";

export async function recalculateAllElos(): Promise<void> {
  const players = await db.select({ id: playersTable.id }).from(playersTable);

  const eloMap = new Map<number, number>();
  const gamesMap = new Map<number, number>();
  for (const p of players) {
    eloMap.set(p.id, 1200);
    gamesMap.set(p.id, 0);
  }

  const matches = await db.select().from(matchesTable).orderBy(asc(matchesTable.playedAt));
  const allMatchPlayers = await db.select().from(matchPlayersTable);

  const participantsByMatch = new Map<number, typeof allMatchPlayers>();
  for (const mp of allMatchPlayers) {
    if (!participantsByMatch.has(mp.matchId)) participantsByMatch.set(mp.matchId, []);
    participantsByMatch.get(mp.matchId)!.push(mp);
  }

  for (const match of matches) {
    const participants = participantsByMatch.get(match.id) ?? [];
    const team1Ids = participants.filter(p => p.team === 1).map(p => p.playerId);
    const team2Ids = participants.filter(p => p.team === 2).map(p => p.playerId);
    if (team1Ids.length === 0 || team2Ids.length === 0) continue;

    const getElo = (id: number) => eloMap.get(id) ?? 1200;
    const getGames = (id: number) => gamesMap.get(id) ?? 0;
    const getK = (id: number) => (getGames(id) < 10 ? 32 : 16);

    const team1AvgElo = team1Ids.reduce((s, id) => s + getElo(id), 0) / team1Ids.length;
    const team2AvgElo = team2Ids.reduce((s, id) => s + getElo(id), 0) / team2Ids.length;

    const team1Expected = 1 / (1 + Math.pow(10, (team2AvgElo - team1AvgElo) / 400));
    const team2Expected = 1 - team1Expected;
    const team1Won = match.winnerTeam === 1;

    for (const id of team1Ids) {
      const delta = Math.round(getK(id) * ((team1Won ? 1 : 0) - team1Expected));
      eloMap.set(id, getElo(id) + delta);
      gamesMap.set(id, getGames(id) + 1);
    }
    for (const id of team2Ids) {
      const delta = Math.round(getK(id) * ((team1Won ? 0 : 1) - team2Expected));
      eloMap.set(id, getElo(id) + delta);
      gamesMap.set(id, getGames(id) + 1);
    }
  }

  for (const [playerId, elo] of eloMap.entries()) {
    await db.update(playersTable).set({ elo }).where(eq(playersTable.id, playerId));
  }
}
