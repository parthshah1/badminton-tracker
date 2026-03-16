import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { SwipeableMatchCard } from "@/components/SwipeableMatchCard";
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const matchesQuery = useQuery({ queryKey: ["matches"], queryFn: fetchMatches });
  const leaderboardQuery = useQuery({ queryKey: ["leaderboard"], queryFn: fetchLeaderboard });

  const topPlayer = leaderboardQuery.data?.[0];
  const recentMatches = matchesQuery.data?.slice(0, 5) ?? [];
  const allMatches = matchesQuery.data ?? [];
  const leaderboard = leaderboardQuery.data ?? [];

  const totalMatches = allMatches.length;
  const avgWinRate =
    leaderboard.length > 0
      ? Math.round(
          (leaderboard.reduce((sum: number, p: any) => sum + p.winRate, 0) / leaderboard.length) * 100
        )
      : 0;
  const activeStreak = leaderboard.find((p: any) => p.currentWinStreak >= 3);

  const handleDeleteMatch = async (id: number) => {
    await fetch(`${BASE}/api/matches/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["playerStats"] });
  };

  const topPadding = isWeb ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: isWeb ? 34 + 84 : 100,
        }}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={isDark ? ["#14532D", "#0F172A"] : ["#15803D", "#16A34A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: topPadding + 20 }]}
        >
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroGreeting}>{getGreeting()}</Text>
              <Text style={styles.heroTitle}>Badminton Tracker</Text>
            </View>
            <Pressable
              onPress={() => router.push("/add-player")}
              style={({ pressed }) => [styles.addPlayerBtn, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Feather name="user-plus" size={19} color="#fff" />
            </Pressable>
          </View>

          {/* Quick stats strip */}
          {(totalMatches > 0 || leaderboard.length > 0) && (
            <View style={styles.statsStrip}>
              <View style={styles.statChip}>
                <Text style={styles.statChipValue}>{totalMatches}</Text>
                <Text style={styles.statChipLabel}>Matches</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={styles.statChipValue}>{leaderboard.length}</Text>
                <Text style={styles.statChipLabel}>Players</Text>
              </View>
              {avgWinRate > 0 && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.statChip}>
                    <Text style={styles.statChipValue}>{avgWinRate}%</Text>
                    <Text style={styles.statChipLabel}>Avg Win Rate</Text>
                  </View>
                </>
              )}
              {activeStreak && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.statChip}>
                    <Text style={styles.statChipValue}>🔥 {activeStreak.currentWinStreak}</Text>
                    <Text style={styles.statChipLabel}>{activeStreak.playerName.split(" ")[0]}</Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Log Match CTA */}
          <Pressable
            onPress={() => router.push("/add-match")}
            style={({ pressed }) => [styles.ctaButton, { opacity: pressed ? 0.88 : 1 }]}
          >
            <View style={styles.ctaInner}>
              <Feather name="plus-circle" size={22} color="#16A34A" />
              <Text style={styles.ctaText}>Log Match Result</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </Pressable>
        </LinearGradient>

        <View style={styles.body}>
          {/* Top Performer */}
          {topPlayer && topPlayer.totalMatches > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Performer</Text>
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/player/[id]", params: { id: topPlayer.playerId } })
                }
                style={({ pressed }) => [
                  styles.topCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: isDark ? "#000" : "#94A3B8",
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <View style={[styles.topCardAccent, { backgroundColor: colors.tint }]} />
                <View style={styles.topCardContent}>
                  <View style={styles.topCardLeft}>
                    <View style={styles.topAvatarWrap}>
                      <PlayerAvatar
                        name={topPlayer.playerName}
                        color={topPlayer.avatarColor}
                        size={56}
                        fontSize={20}
                      />
                      <View style={[styles.crownBadge, { backgroundColor: "#FEF3C7" }]}>
                        <Text style={styles.crownEmoji}>👑</Text>
                      </View>
                    </View>
                    <View>
                      <Text style={[styles.topName, { color: colors.text }]}>
                        {topPlayer.playerName}
                      </Text>
                      <Text style={[styles.topRecord, { color: colors.textSecondary }]}>
                        {topPlayer.wins}W · {topPlayer.losses}L · {topPlayer.totalMatches} played
                      </Text>
                    </View>
                  </View>
                  <View style={styles.topCardRight}>
                    <Text style={[styles.topWinRate, { color: colors.tint }]}>
                      {Math.round(topPlayer.winRate * 100)}%
                    </Text>
                    <Text style={[styles.topWinRateLabel, { color: colors.textMuted }]}>
                      win rate
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>
          )}

          {/* Recent Matches */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Matches</Text>
              {recentMatches.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>
                    {totalMatches}
                  </Text>
                </View>
              )}
            </View>

            {matchesQuery.isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.tint} size="large" />
              </View>
            ) : recentMatches.length === 0 ? (
              <View
                style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.tint + "15" }]}>
                  <Feather name="activity" size={28} color={colors.tint} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No matches yet</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Tap "Log Match Result" above to record your first game
                </Text>
              </View>
            ) : (
              <View style={styles.matchList}>
                {recentMatches.map(match => (
                  <SwipeableMatchCard
                    key={match.id}
                    match={match}
                    colors={colors}
                    onDelete={handleDeleteMatch}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroGreeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  addPlayerBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  statChip: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statChipValue: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  statChipLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  ctaButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#0F172A",
  },
  body: {
    padding: 20,
    gap: 28,
  },
  section: { gap: 14 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  topCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topCardAccent: {
    width: 5,
  },
  topCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  topCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  topAvatarWrap: {
    position: "relative",
  },
  crownBadge: {
    position: "absolute",
    top: -10,
    left: "50%",
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  crownEmoji: { fontSize: 11 },
  topName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  topRecord: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  topCardRight: {
    alignItems: "flex-end",
  },
  topWinRate: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  topWinRateLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  matchList: { gap: 12 },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyBox: {
    alignItems: "center",
    padding: 36,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
