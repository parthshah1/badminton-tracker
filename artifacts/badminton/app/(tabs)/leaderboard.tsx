import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { StatBar } from "@/components/StatBar";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

async function fetchLeaderboard() {
  const res = await fetch(`${BASE}/api/stats/leaderboard`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any[]>;
}

const MEDAL_COLORS = ["#F59E0B", "#94A3B8", "#CD7F32"];
const MEDAL_ICONS = ["award", "award", "award"] as const;

export default function LeaderboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  const players = data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: isWeb ? insets.top + 67 : insets.top + 16,
          paddingBottom: isWeb ? 34 + 84 : 100,
          paddingHorizontal: 16,
          gap: 20,
        }}
        refreshing={isRefetching}
        onScrollBeginDrag={() => {}}
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>Leaderboard</Text>

        {/* Podium top 3 */}
        {players.length >= 3 && (
          <View style={[styles.podiumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.podiumLabel, { color: colors.textMuted }]}>This Season</Text>
            <View style={styles.podiumRow}>
              {/* 2nd */}
              <PodiumItem player={players[1]} rank={2} colors={colors} />
              {/* 1st */}
              <PodiumItem player={players[0]} rank={1} colors={colors} />
              {/* 3rd */}
              <PodiumItem player={players[2]} rank={3} colors={colors} />
            </View>
          </View>
        )}

        {/* Full ranking list */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>All Players</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.tint} style={{ marginTop: 20 }} />
          ) : players.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="users" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No players yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Add players and log matches to see rankings</Text>
            </View>
          ) : (
            <View style={styles.rankList}>
              {players.map((player, idx) => (
                <Pressable
                  key={player.playerId}
                  onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.playerId } })}
                  style={({ pressed }) => [
                    styles.rankRow,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={styles.rankBadgeWrap}>
                    {idx < 3 ? (
                      <Feather name="award" size={20} color={MEDAL_COLORS[idx]} />
                    ) : (
                      <Text style={[styles.rankNum, { color: colors.textMuted }]}>{idx + 1}</Text>
                    )}
                  </View>
                  <PlayerAvatar name={player.playerName} color={player.avatarColor} size={44} fontSize={16} />
                  <View style={styles.rankInfo}>
                    <View style={styles.rankNameRow}>
                      <Text style={[styles.rankName, { color: colors.text }]}>{player.playerName}</Text>
                      {player.currentWinStreak >= 3 && (
                        <Text style={styles.fireStreak}>🔥 {player.currentWinStreak}</Text>
                      )}
                    </View>
                    <StatBar wins={player.wins} losses={player.losses} />
                  </View>
                  <View style={styles.rankStats}>
                    <Text style={[styles.winRate, { color: colors.tint }]}>
                      {Math.round(player.winRate * 100)}%
                    </Text>
                    <Text style={[styles.matchCount, { color: colors.textMuted }]}>
                      {player.totalMatches} matches
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function PodiumItem({ player, rank, colors }: { player: any; rank: number; colors: any }) {
  const medalColor = MEDAL_COLORS[rank - 1];
  const avatarSize = rank === 1 ? 64 : 52;
  const height = rank === 1 ? 80 : rank === 2 ? 56 : 40;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.playerId } })}
      style={styles.podiumItem}
    >
      <View style={styles.podiumAvatarWrap}>
        {rank === 1 && (
          <View style={styles.crown}>
            <Feather name="award" size={22} color="#F59E0B" />
          </View>
        )}
        <PlayerAvatar name={player.playerName} color={player.avatarColor} size={avatarSize} fontSize={rank === 1 ? 22 : 18} />
      </View>
      <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
        {player.playerName.split(" ")[0]}
      </Text>
      <Text style={[styles.podiumWinRate, { color: medalColor }]}>
        {Math.round(player.winRate * 100)}%
      </Text>
      <View style={[styles.podiumBase, { height, backgroundColor: medalColor + "33", borderColor: medalColor }]}>
        <Text style={[styles.podiumRank, { color: medalColor }]}>{rank}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  podiumCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  podiumLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  podiumRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 16,
  },
  podiumItem: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  podiumAvatarWrap: {
    position: "relative",
    alignItems: "center",
  },
  crown: {
    position: "absolute",
    top: -20,
    zIndex: 1,
  },
  podiumName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  podiumWinRate: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  podiumBase: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
  },
  podiumRank: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  rankList: {
    gap: 8,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  rankBadgeWrap: {
    width: 28,
    alignItems: "center",
  },
  rankNum: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  rankInfo: {
    flex: 1,
    gap: 6,
  },
  rankNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rankName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  fireStreak: {
    fontSize: 13,
  },
  rankStats: {
    alignItems: "flex-end",
    gap: 2,
  },
  winRate: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  matchCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  emptyBox: {
    alignItems: "center",
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
