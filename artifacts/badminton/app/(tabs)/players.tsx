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
      >
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Players</Text>
          <Pressable
            onPress={() => router.push("/add-player")}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Player</Text>
          </Pressable>
        </View>

        {playersQuery.isLoading ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 40 }} />
        ) : players.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No players yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Add your group members to start tracking
            </Text>
            <Pressable
              onPress={() => router.push("/add-player")}
              style={({ pressed }) => [
                styles.emptyBtn,
                { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.emptyBtnText}>Add First Player</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.playerList}>
            {players.map((player) => {
              const stats = statsMap.get(player.id);
              return (
                <Pressable
                  key={player.id}
                  onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.id } })}
                  style={({ pressed }) => [
                    styles.playerCard,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <PlayerAvatar name={player.name} color={player.avatarColor} size={52} fontSize={18} />
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, { color: colors.text }]}>{player.name}</Text>
                    {stats ? (
                      <Text style={[styles.playerStats, { color: colors.textSecondary }]}>
                        {stats.totalMatches} matches · {Math.round(stats.winRate * 100)}% win rate
                      </Text>
                    ) : (
                      <Text style={[styles.playerStats, { color: colors.textMuted }]}>No matches yet</Text>
                    )}
                  </View>
                  {stats && stats.currentWinStreak >= 2 && (
                    <Text style={styles.streak}>🔥 {stats.currentWinStreak}</Text>
                  )}
                  <Feather name="chevron-right" size={18} color={colors.textMuted} />
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
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  playerList: {
    gap: 8,
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  playerInfo: {
    flex: 1,
    gap: 3,
  },
  playerName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  playerStats: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  streak: {
    fontSize: 14,
  },
  emptyBox: {
    alignItems: "center",
    padding: 48,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
