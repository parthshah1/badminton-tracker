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
import { MatchCard } from "@/components/MatchCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

async function fetchMatches() {
  const res = await fetch(`${BASE}/api/matches?limit=10`);
  if (!res.ok) throw new Error("Failed to fetch matches");
  return res.json() as Promise<any[]>;
}

async function fetchLeaderboard() {
  const res = await fetch(`${BASE}/api/stats/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json() as Promise<any[]>;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const matchesQuery = useQuery({ queryKey: ["matches"], queryFn: fetchMatches });
  const leaderboardQuery = useQuery({ queryKey: ["leaderboard"], queryFn: fetchLeaderboard });

  const topPlayer = leaderboardQuery.data?.[0];
  const recentMatches = matchesQuery.data?.slice(0, 5) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: isWeb ? insets.top + 67 : insets.top + 16,
          paddingBottom: isWeb ? 34 + 84 : 100,
          paddingHorizontal: 16,
          gap: 24,
        }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>Good game!</Text>
            <Text style={[styles.title, { color: colors.text }]}>Badminton Tracker</Text>
          </View>
          <Pressable
            onPress={() => router.push("/add-player")}
            style={({ pressed }) => [
              styles.addPlayerBtn,
              { backgroundColor: colors.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="user-plus" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Log Match CTA */}
        <Pressable
          onPress={() => router.push("/add-match")}
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: colors.tint, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Feather name="plus" size={22} color="#fff" />
          <Text style={styles.ctaText}>Log Match Result</Text>
        </Pressable>

        {/* Top Performer */}
        {topPlayer && (topPlayer.totalMatches > 0) && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Performer</Text>
            <Pressable
              onPress={() => router.push({ pathname: "/player/[id]", params: { id: topPlayer.playerId } })}
              style={({ pressed }) => [
                styles.topPerformerCard,
                { backgroundColor: colors.card, borderColor: colors.tint, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={styles.trophyBadge}>
                <Feather name="award" size={18} color="#F59E0B" />
              </View>
              <PlayerAvatar name={topPlayer.playerName} color={topPlayer.avatarColor} size={52} fontSize={20} />
              <View style={styles.topPerformerInfo}>
                <Text style={[styles.topPerformerName, { color: colors.text }]}>{topPlayer.playerName}</Text>
                <Text style={[styles.topPerformerStat, { color: colors.textSecondary }]}>
                  {Math.round(topPlayer.winRate * 100)}% win rate · {topPlayer.wins}W {topPlayer.losses}L
                </Text>
              </View>
              {topPlayer.currentWinStreak >= 2 && (
                <View style={[styles.streakBadge, { backgroundColor: "#FEF3C7" }]}>
                  <Text style={styles.streakText}>🔥 {topPlayer.currentWinStreak}</Text>
                </View>
              )}
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Recent Matches */}
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Matches</Text>
            <Pressable onPress={() => {}}>
              <Text style={[styles.seeAll, { color: colors.tint }]}>See all</Text>
            </Pressable>
          </View>

          {matchesQuery.isLoading ? (
            <ActivityIndicator color={colors.tint} style={{ marginTop: 20 }} />
          ) : recentMatches.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="activity" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No matches yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Log your first match above!</Text>
            </View>
          ) : (
            <View style={styles.matchList}>
              {recentMatches.map(match => (
                <MatchCard key={match.id} {...match} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  addPlayerBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
  },
  ctaText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  topPerformerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  trophyBadge: {
    position: "absolute",
    top: -8,
    left: 16,
  },
  topPerformerInfo: {
    flex: 1,
    gap: 3,
  },
  topPerformerName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  topPerformerStat: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  streakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streakText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  matchList: {
    gap: 10,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
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
  },
});
