import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { PlayerAvatar } from "./PlayerAvatar";

interface MatchPlayer {
  playerId: number;
  playerName: string;
  avatarColor: string;
  team: number;
}

interface MatchCardProps {
  matchType: string;
  team1Score: number;
  team2Score: number;
  winnerTeam: number;
  players: MatchPlayer[];
  playedAt: string;
  notes?: string;
  compact?: boolean;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MatchCard({
  matchType,
  team1Score,
  team2Score,
  winnerTeam,
  players,
  playedAt,
  notes,
  compact = false,
}: MatchCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const team1Players = players.filter(p => p.team === 1);
  const team2Players = players.filter(p => p.team === 2);
  const team1Won = winnerTeam === 1;
  const team2Won = winnerTeam === 2;

  const avatarSize = compact ? 24 : 30;

  function TeamRow({
    teamPlayers,
    score,
    won,
  }: {
    teamPlayers: MatchPlayer[];
    score: number;
    won: boolean;
  }) {
    const names = teamPlayers.map(p => p.playerName.split(" ")[0]).join(" & ");
    const winnerBg = isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.06)";

    return (
      <View style={[styles.teamRow, { backgroundColor: won ? winnerBg : "transparent" }]}>
        <View style={[styles.accentBar, { backgroundColor: won ? colors.tint : "transparent" }]} />
        <View style={styles.teamContent}>
          <View style={styles.teamLeft}>
            <View style={styles.avatarStack}>
              {teamPlayers.map((p, i) => (
                <View key={p.playerId} style={i > 0 ? styles.avatarOverlap : undefined}>
                  <PlayerAvatar
                    name={p.playerName}
                    color={p.avatarColor}
                    size={avatarSize}
                    fontSize={compact ? 9 : 11}
                  />
                </View>
              ))}
            </View>
            {!compact && (
              <Text
                style={[
                  styles.teamName,
                  { color: won ? colors.text : colors.textSecondary },
                  won && styles.teamNameWinner,
                ]}
                numberOfLines={1}
              >
                {names}
              </Text>
            )}
          </View>
          <View style={styles.teamRight}>
            <Text
              style={[
                styles.score,
                { color: won ? colors.tint : colors.textMuted },
                won && styles.scoreWinner,
              ]}
            >
              {score}
            </Text>
            <View
              style={[
                styles.resultIndicator,
                {
                  backgroundColor: won
                    ? colors.tint
                    : isDark ? "rgba(255,255,255,0.12)" : "#E2E8F0",
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border,
          shadowColor: isDark ? "#000" : "#64748B",
        },
      ]}
    >
      <TeamRow teamPlayers={team1Players} score={team1Score} won={team1Won} />
      <View style={[styles.rowDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.border }]} />
      <TeamRow teamPlayers={team2Players} score={team2Score} won={team2Won} />

      <View style={[styles.footer, { borderTopColor: isDark ? "rgba(255,255,255,0.05)" : colors.border }]}>
        <View style={[styles.typePill, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : colors.backgroundSecondary }]}>
          <Text style={[styles.typeText, { color: colors.textMuted }]}>
            {matchType === "singles" ? "SINGLES" : "DOUBLES"}
          </Text>
        </View>
        {notes && !compact && (
          <Text style={[styles.notesText, { color: colors.textMuted }]} numberOfLines={1}>
            · {notes}
          </Text>
        )}
        <View style={styles.footerSpacer} />
        <Text style={[styles.dateText, { color: colors.textMuted }]}>{formatDate(playedAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  accentBar: {
    width: 3,
  },
  teamContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingLeft: 12,
    paddingRight: 14,
    gap: 10,
  },
  teamLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarStack: {
    flexDirection: "row",
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  teamName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  teamNameWinner: {
    fontFamily: "Inter_700Bold",
  },
  teamRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  score: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
    minWidth: 30,
    textAlign: "right",
    letterSpacing: -1,
  },
  scoreWinner: {
    fontSize: 34,
  },
  resultIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowDivider: {
    height: 1,
    marginLeft: 3,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  typeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  notesText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
  },
  footerSpacer: {
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
