import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
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

  const avatarSize = compact ? 26 : 32;

  function TeamRow({
    teamPlayers,
    score,
    won,
    isTop,
  }: {
    teamPlayers: MatchPlayer[];
    score: number;
    won: boolean;
    isTop: boolean;
  }) {
    const names = teamPlayers.map(p => p.playerName.split(" ")[0]).join(" & ");
    return (
      <View
        style={[
          styles.teamRow,
          won && styles.teamRowWinner,
          won && { backgroundColor: colors.tint + "12" },
          isTop ? styles.teamRowTop : styles.teamRowBottom,
        ]}
      >
        <View style={styles.teamLeft}>
          <View style={styles.avatarStack}>
            {teamPlayers.map((p, i) => (
              <View
                key={p.playerId}
                style={[
                  styles.avatarWrap,
                  { marginLeft: i > 0 ? -10 : 0 },
                  { borderColor: isDark ? colors.card : "#fff" },
                ]}
              >
                <PlayerAvatar
                  name={p.playerName}
                  color={p.avatarColor}
                  size={avatarSize}
                  fontSize={compact ? 10 : 12}
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
          {won ? (
            <View style={[styles.winBadge, { backgroundColor: colors.tint }]}>
              <Text style={styles.winBadgeText}>W</Text>
            </View>
          ) : (
            <View style={[styles.lossBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.lossBadgeText, { color: colors.textMuted }]}>L</Text>
            </View>
          )}
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
          borderColor: colors.border,
          shadowColor: isDark ? "#000" : "#94A3B8",
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.typePill, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.typeText, { color: colors.textSecondary }]}>
            {matchType === "singles" ? "SINGLES" : "DOUBLES"}
          </Text>
        </View>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>{formatDate(playedAt)}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.teamsContainer}>
        <TeamRow teamPlayers={team1Players} score={team1Score} won={team1Won} isTop />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <TeamRow teamPlayers={team2Players} score={team2Score} won={team2Won} isTop={false} />
      </View>

      {notes && !compact && (
        <View style={[styles.notesRow, { borderTopColor: colors.border }]}>
          <Feather name="message-circle" size={12} color={colors.textMuted} />
          <Text style={[styles.notesText, { color: colors.textMuted }]} numberOfLines={1}>
            {notes}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  dateText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
  },
  teamsContainer: {},
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  teamRowWinner: {},
  teamRowTop: { borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  teamRowBottom: {},
  rowDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  teamLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarStack: {
    flexDirection: "row",
  },
  avatarWrap: {
    borderWidth: 2,
    borderRadius: 20,
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
    gap: 8,
  },
  score: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    lineHeight: 30,
    minWidth: 32,
    textAlign: "right",
  },
  scoreWinner: {
    fontSize: 30,
  },
  winBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  winBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  lossBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  lossBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  notesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  notesText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
