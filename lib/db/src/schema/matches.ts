import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  matchType: text("match_type").notNull().$type<"singles" | "doubles">(),
  team1Score: integer("team1_score").notNull(),
  team2Score: integer("team2_score").notNull(),
  winnerTeam: integer("winner_team").notNull(),
  notes: text("notes"),
  playedAt: timestamp("played_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const matchPlayersTable = pgTable("match_players", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matchesTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull(),
  team: integer("team").notNull(),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true, createdAt: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
export type MatchPlayer = typeof matchPlayersTable.$inferSelect;
