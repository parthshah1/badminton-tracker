import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
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
import { MatchCard } from "@/components/MatchCard";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

async function fetchPlayerStats(id: string) {
  const res = await fetch(`${BASE}/api/players/${id}/stats`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any>;
}

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["playerStats", id],
    queryFn: () => fetchPlayerStats(id!),
    enabled: !!id,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back button */}
      <View style={[styles.topBar, { paddingTop: isWeb ? insets.top + 67 : insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      ) : error || !stats ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={colors.textMuted} />
          <Text style={[styles.errorMsg, { color: colors.textMuted }]}>Could not load player</Text>
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: isWeb ? 34 + 84 : 100,
            gap: 20,
            paddingTop: 12,
          }}
        >
          {/* Player hero */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <PlayerAvatar name={stats.playerName} color={stats.avatarColor ?? "#3B82F6"} size={72} fontSize={26} />
            <Text style={[styles.heroName, { color: colors.text }]}>{stats.playerName}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              {stats.totalMatches} {stats.totalMatches === 1 ? "match" : "matches"} played
            </Text>
            <View style={[styles.winRateBadge, { backgroundColor: colors.tint + "20" }]}>
              <Text style={[styles.winRateValue, { color: colors.tint }]}>
                {Math.round(stats.winRate * 100)}%
              </Text>
              <Text style={[styles.winRateLabel, { color: colors.tint }]}>Win Rate</Text>
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatCard label="Wins" value={stats.wins} color={colors.tint} colors={colors} />
            <StatCard label="Losses" value={stats.losses} color={colors.danger} colors={colors} />
            <StatCard label="Win Streak" value={stats.currentWinStreak} color="#F59E0B" colors={colors} />
            <StatCard label="Best Streak" value={stats.longestWinStreak} color="#8B5CF6" colors={colors} />
          </View>

          {/* Breakdown */}
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.breakdownTitle, { color: colors.text }]}>Format Breakdown</Text>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownType, { color: colors.textSecondary }]}>Singles</Text>
                <Text style={[styles.breakdownScore, { color: colors.text }]}>
                  {stats.singlesWins}W – {stats.singlesLosses}L
                </Text>
                <View style={[styles.miniBar, { backgroundColor: colors.border }]}>
                  {(stats.singlesWins + stats.singlesLosses) > 0 && (
                    <View
                      style={[
                        styles.miniBarFill,
                        {
                          backgroundColor: colors.tint,
                          width: `${(stats.singlesWins / (stats.singlesWins + stats.singlesLosses)) * 100}%`,
                        },
                      ]}
                    />
                  )}
                </View>
              </View>
              <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownType, { color: colors.textSecondary }]}>Doubles</Text>
                <Text style={[styles.breakdownScore, { color: colors.text }]}>
                  {stats.doublesWins}W – {stats.doublesLosses}L
                </Text>
                <View style={[styles.miniBar, { backgroundColor: colors.border }]}>
                  {(stats.doublesWins + stats.doublesLosses) > 0 && (
                    <View
                      style={[
                        styles.miniBarFill,
                        {
                          backgroundColor: colors.tint,
                          width: `${(stats.doublesWins / (stats.doublesWins + stats.doublesLosses)) * 100}%`,
                        },
                      ]}
                    />
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Recent matches */}
          {stats.recentMatches && stats.recentMatches.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Matches</Text>
              <View style={styles.matchList}>
                {stats.recentMatches.map((match: any) => (
                  <MatchCard key={match.id} {...match} compact />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorMsg: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  heroName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  winRateBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  winRateValue: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  winRateLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  breakdownCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 16,
  },
  breakdownItem: {
    flex: 1,
    gap: 6,
  },
  breakdownType: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  breakdownScore: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  miniBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  miniBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  breakdownDivider: {
    width: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  matchList: {
    gap: 10,
  },
});
