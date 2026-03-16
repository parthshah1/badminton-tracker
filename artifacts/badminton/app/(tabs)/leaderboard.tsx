import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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

async function fetchLeaderboard() {
  const res = await fetch(`${BASE}/api/stats/leaderboard`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any[]>;
}

const MEDALS = [
  { color: "#F59E0B", label: "Gold", bg: "#FEFCE8" },
  { color: "#94A3B8", label: "Silver", bg: "#F8FAFC" },
  { color: "#CD7F32", label: "Bronze", bg: "#FFF7ED" },
];

export default function LeaderboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  const players = data ?? [];
  const topPadding = isWeb ? insets.top + 67 : insets.top + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: isWeb ? 34 + 84 : 100,
        }}
      >
        {/* Page header */}
        <View style={[styles.pageHeader, { paddingTop: topPadding, backgroundColor: colors.background }]}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Leaderboard</Text>
          {players.length > 0 && (
            <View style={[styles.totalBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.totalBadgeText, { color: colors.textSecondary }]}>
                {players.length} players
              </Text>
            </View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.tint} size="large" />
          </View>
        ) : players.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.tint + "15" }]}>
                <Feather name="award" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No rankings yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Add players and log matches to build the leaderboard
              </Text>
            </View>
          </View>
        ) : (
          <>
            {/* Podium */}
            {players.length >= 2 && (
              <View style={styles.podiumSection}>
                <LinearGradient
                  colors={isDark ? ["#1E293B", "#0F172A"] : ["#F8FAFC", "#F1F5F9"]}
                  style={[styles.podiumCard, { borderColor: colors.border }]}
                >
                  <Text style={[styles.podiumSeason, { color: colors.textMuted }]}>RANKINGS</Text>
                  <View style={styles.podiumRow}>
                    {players.length >= 2 && (
                      <PodiumItem player={players[1]} rank={2} colors={colors} isDark={isDark} />
                    )}
                    <PodiumItem player={players[0]} rank={1} colors={colors} isDark={isDark} />
                    {players.length >= 3 && (
                      <PodiumItem player={players[2]} rank={3} colors={colors} isDark={isDark} />
                    )}
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Full list */}
            <View style={styles.listSection}>
              <Text style={[styles.listTitle, { color: colors.text }]}>All Players</Text>
              <View style={styles.rankList}>
                {players.map((player, idx) => {
                  const medal = idx < 3 ? MEDALS[idx] : null;
                  const isTop = idx === 0;
                  return (
                    <Pressable
                      key={player.playerId}
                      onPress={() =>
                        router.push({ pathname: "/player/[id]", params: { id: player.playerId } })
                      }
                      style={({ pressed }) => [
                        styles.rankRow,
                        {
                          backgroundColor: colors.card,
                          borderColor: isTop ? colors.tint + "40" : colors.border,
                          shadowColor: isDark ? "#000" : "#94A3B8",
                          opacity: pressed ? 0.82 : 1,
                        },
                      ]}
                    >
                      {isTop && (
                        <View style={[styles.topRowAccent, { backgroundColor: colors.tint }]} />
                      )}
                      <View style={styles.rankLeft}>
                        <View style={[styles.rankBadge, medal ? { backgroundColor: medal.bg } : { backgroundColor: colors.backgroundSecondary }]}>
                          {medal ? (
                            <Text style={[styles.rankMedalEmoji]}>
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                            </Text>
                          ) : (
                            <Text style={[styles.rankNum, { color: colors.textMuted }]}>{idx + 1}</Text>
                          )}
                        </View>
                        <PlayerAvatar
                          name={player.playerName}
                          color={player.avatarColor}
                          size={46}
                          fontSize={16}
                        />
                        <View style={styles.rankInfo}>
                          <View style={styles.rankNameRow}>
                            <Text style={[styles.rankName, { color: colors.text }]}>
                              {player.playerName}
                            </Text>
                            {player.currentWinStreak >= 3 && (
                              <View style={[styles.streakPill, { backgroundColor: "#FEF3C7" }]}>
                                <Text style={styles.streakPillText}>
                                  🔥 {player.currentWinStreak}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.rankMatches, { color: colors.textMuted }]}>
                            {player.totalMatches} {player.totalMatches === 1 ? "match" : "matches"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.rankRight}>
                        <View style={styles.wlRow}>
                          <View style={[styles.wPill, { backgroundColor: colors.tint + "18" }]}>
                            <Text style={[styles.wPillText, { color: colors.tint }]}>
                              {player.wins}W
                            </Text>
                          </View>
                          <View style={[styles.lPill, { backgroundColor: colors.danger + "12" }]}>
                            <Text style={[styles.lPillText, { color: colors.danger }]}>
                              {player.losses}L
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.winRateLarge, { color: isTop ? colors.tint : colors.text }]}>
                          {Math.round(player.winRate * 100)}%
                        </Text>
                      </View>

                      <Feather name="chevron-right" size={16} color={colors.textMuted} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PodiumItem({
  player,
  rank,
  colors,
  isDark,
}: {
  player: any;
  rank: number;
  colors: any;
  isDark: boolean;
}) {
  const medal = MEDALS[rank - 1];
  const avatarSize = rank === 1 ? 68 : 52;
  const platformH = rank === 1 ? 76 : rank === 2 ? 52 : 36;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.playerId } })}
      style={[styles.podiumItem]}
    >
      <View style={styles.podiumAvatarArea}>
        {rank === 1 && <Text style={styles.crownText}>👑</Text>}
        <PlayerAvatar
          name={player.playerName}
          color={player.avatarColor}
          size={avatarSize}
          fontSize={rank === 1 ? 24 : 18}
        />
      </View>
      <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
        {player.playerName.split(" ")[0]}
      </Text>
      <Text style={[styles.podiumRate, { color: medal.color }]}>
        {Math.round(player.winRate * 100)}%
      </Text>
      <View
        style={[
          styles.podiumPlatform,
          {
            height: platformH,
            backgroundColor: medal.color + "22",
            borderColor: medal.color + "55",
          },
        ]}
      >
        <Text style={[styles.podiumRankNum, { color: medal.color }]}>{rank}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  totalBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyWrap: {
    padding: 20,
  },
  emptyBox: {
    alignItems: "center",
    padding: 44,
    borderRadius: 24,
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
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  podiumSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  podiumCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingTop: 16,
  },
  podiumSeason: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textAlign: "center",
    marginBottom: 20,
  },
  podiumRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 12,
  },
  podiumItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  podiumAvatarArea: {
    alignItems: "center",
    gap: 4,
  },
  crownText: { fontSize: 20 },
  podiumName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  podiumRate: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  podiumPlatform: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
  },
  podiumRankNum: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  listSection: {
    padding: 20,
    gap: 14,
  },
  listTitle: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
  },
  rankList: { gap: 10 },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  topRowAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  rankLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rankMedalEmoji: { fontSize: 18 },
  rankNum: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  rankInfo: { gap: 3, flex: 1 },
  rankNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  rankName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  streakPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  streakPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  rankMatches: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  rankRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  wlRow: {
    flexDirection: "row",
    gap: 4,
  },
  wPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  wPillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  lPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  lPillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  winRateLarge: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
});
