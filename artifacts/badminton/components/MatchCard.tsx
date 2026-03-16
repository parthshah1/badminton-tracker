import { Feather } from "@expo/vector-icons";
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
  compact?: boolean;
}

export function MatchCard({
  matchType,
  team1Score,
  team2Score,
  winnerTeam,
  players,
  playedAt,
  compact = false,
}: MatchCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const team1Players = players.filter(p => p.team === 1);
  const team2Players = players.filter(p => p.team === 2);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const avatarSize = compact ? 28 : 34;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.typeText, { color: colors.textSecondary }]}>
            {matchType === "singles" ? "1v1" : "2v2"}
          </Text>
        </View>
        <Text style={[styles.date, { color: colors.textMuted }]}>{formatDate(playedAt)}</Text>
      </View>

      <View style={styles.matchRow}>
        <View style={[styles.teamSide, styles.teamLeft]}>
          <View style={styles.avatarRow}>
            {team1Players.map((p, i) => (
              <View key={p.playerId} style={[styles.avatarWrap, { marginLeft: i > 0 ? -8 : 0 }]}>
                <PlayerAvatar name={p.playerName} color={p.avatarColor} size={avatarSize} fontSize={12} />
              </View>
            ))}
          </View>
          {!compact && (
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
              {team1Players.map(p => p.playerName.split(" ")[0]).join(" & ")}
            </Text>
          )}
        </View>

        <View style={styles.scoreBlock}>
          <View style={styles.scoreRow}>
            <Text
              style={[
                styles.score,
                { color: winnerTeam === 1 ? colors.tint : colors.textMuted },
              ]}
            >
              {team1Score}
            </Text>
            <Text style={[styles.scoreSep, { color: colors.textMuted }]}>–</Text>
            <Text
              style={[
                styles.score,
                { color: winnerTeam === 2 ? colors.tint : colors.textMuted },
              ]}
            >
              {team2Score}
            </Text>
          </View>
          {winnerTeam === 1 && (
            <View style={styles.winIndicatorLeft}>
              <Feather name="chevron-left" size={12} color={colors.tint} />
            </View>
          )}
          {winnerTeam === 2 && (
            <View style={styles.winIndicatorRight}>
              <Feather name="chevron-right" size={12} color={colors.tint} />
            </View>
          )}
        </View>

        <View style={[styles.teamSide, styles.teamRight]}>
          <View style={styles.avatarRow}>
            {team2Players.map((p, i) => (
              <View key={p.playerId} style={[styles.avatarWrap, { marginLeft: i > 0 ? -8 : 0 }]}>
                <PlayerAvatar name={p.playerName} color={p.avatarColor} size={avatarSize} fontSize={12} />
              </View>
            ))}
          </View>
          {!compact && (
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
              {team2Players.map(p => p.playerName.split(" ")[0]).join(" & ")}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamSide: {
    flex: 1,
    gap: 6,
  },
  teamLeft: {
    alignItems: "flex-start",
  },
  teamRight: {
    alignItems: "flex-end",
  },
  avatarRow: {
    flexDirection: "row",
  },
  avatarWrap: {
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 20,
  },
  teamName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    maxWidth: 120,
  },
  scoreBlock: {
    alignItems: "center",
    minWidth: 80,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  score: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 34,
  },
  scoreSep: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
  },
  winIndicatorLeft: {
    position: "absolute",
    left: -12,
    top: "50%",
  },
  winIndicatorRight: {
    position: "absolute",
    right: -12,
    top: "50%",
  },
});
