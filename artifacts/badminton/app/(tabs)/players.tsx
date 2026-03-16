import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { PlayerAvatar } from "@/components/PlayerAvatar";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

async function fetchPlayers() {
  const res = await fetch(`${BASE}/api/players`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any[]>;
}

async function fetchLeaderboard() {
  const res = await fetch(`${BASE}/api/stats/leaderboard`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any[]>;
}

export default function PlayersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const playersQuery = useQuery({ queryKey: ["players"], queryFn: fetchPlayers });
  const leaderboardQuery = useQuery({ queryKey: ["leaderboard"], queryFn: fetchLeaderboard });

  const players = playersQuery.data ?? [];
  const leaderboard = leaderboardQuery.data ?? [];
  const statsMap = new Map(leaderboard.map((e: any) => [e.playerId, e]));
  const topPadding = isWeb ? insets.top + 67 : insets.top + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: isWeb ? 34 + 84 : 100,
          paddingHorizontal: 20,
          gap: 20,
        }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Players</Text>
            {players.length > 0 && (
              <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
                {players.length} {players.length === 1 ? "member" : "members"}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => router.push("/add-player")}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="user-plus" size={17} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {playersQuery.isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.tint} size="large" />
          </View>
        ) : players.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.tint + "15" }]}>
              <Feather name="users" size={28} color={colors.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No players yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Add your group members to start tracking results
            </Text>
            <Pressable
              onPress={() => router.push("/add-player")}
              style={({ pressed }) => [
                styles.emptyBtn,
                { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="user-plus" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Add First Player</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.playerList}>
            {players.map((player, idx) => {
              const stats = statsMap.get(player.id);
              const winRate = stats ? Math.round(stats.winRate * 100) : null;
              const hasMatches = stats && stats.totalMatches > 0;
              const rank = leaderboard.findIndex((e: any) => e.playerId === player.id);
              const rankLabel = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : null;

              return (
                <Pressable
                  key={player.id}
                  onPress={() =>
                    router.push({ pathname: "/player/[id]", params: { id: player.id } })
                  }
                  style={({ pressed }) => [
                    styles.playerCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      shadowColor: isDark ? "#000" : "#94A3B8",
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <View style={styles.playerLeft}>
                    <View style={styles.avatarWrap}>
                      <PlayerAvatar name={player.name} color={player.avatarColor} size={52} fontSize={18} />
                      {rankLabel && (
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankEmoji}>{rankLabel}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={[styles.playerName, { color: colors.text }]}>{player.name}</Text>
                      {hasMatches ? (
                        <View style={styles.statsRow}>
                          <View style={[styles.winPill, { backgroundColor: colors.tint + "18" }]}>
                            <Text style={[styles.winPillText, { color: colors.tint }]}>
                              {stats.wins}W
                            </Text>
                          </View>
                          <View style={[styles.lossPill, { backgroundColor: colors.danger + "12" }]}>
                            <Text style={[styles.lossPillText, { color: colors.danger }]}>
                              {stats.losses}L
                            </Text>
                          </View>
                          <Text style={[styles.matchCount, { color: colors.textMuted }]}>
                            · {stats.totalMatches} played
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.noMatchText, { color: colors.textMuted }]}>
                          No matches yet
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.playerRight}>
                    {winRate !== null && hasMatches ? (
                      <View style={styles.winRateWrap}>
                        <Text
                          style={[
                            styles.winRateNum,
                            {
                              color:
                                winRate >= 60
                                  ? colors.tint
                                  : winRate >= 40
                                  ? colors.text
                                  : colors.danger,
                            },
                          ]}
                        >
                          {winRate}%
                        </Text>
                        <Text style={[styles.winRateLabel, { color: colors.textMuted }]}>
                          win rate
                        </Text>
                      </View>
                    ) : null}
                    {stats && stats.currentWinStreak >= 2 && (
                      <View style={[styles.streakBadge, { backgroundColor: "#FEF3C7" }]}>
                        <Text style={styles.streakText}>🔥 {stats.currentWinStreak}</Text>
                      </View>
                    )}
                    <Feather name="chevron-right" size={16} color={colors.textMuted} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 13,
  },
  addBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: "center",
  },
  playerList: { gap: 10 },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  playerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  avatarWrap: { position: "relative" },
  rankBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 1,
  },
  rankEmoji: { fontSize: 14 },
  playerInfo: { gap: 5, flex: 1 },
  playerName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  winPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  winPillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  lossPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  lossPillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  matchCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  noMatchText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  playerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  winRateWrap: { alignItems: "flex-end" },
  winRateNum: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    lineHeight: 24,
  },
  winRateLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  streakBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  streakText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyBox: {
    alignItems: "center",
    padding: 48,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
    borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
