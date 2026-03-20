import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
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

async function fetchRivalries() {
  const res = await fetch(`${BASE}/api/stats/rivalries`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any[]>;
}

function RivalryCard({ rivalry, colors, isDark }: { rivalry: any; colors: any; isDark: boolean }) {
  const { player1, player2, player1Wins, player2Wins, total } = rivalry;
  const p1Dominant = player1Wins > player2Wins;
  const p2Dominant = player2Wins > player1Wins;
  const tied = player1Wins === player2Wins;

  const p1WinPct = total > 0 ? Math.round((player1Wins / total) * 100) : 50;
  const p2WinPct = 100 - p1WinPct;

  return (
    <View style={[styles.card, {
      backgroundColor: colors.card,
      borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border,
      shadowColor: isDark ? "#000" : "#64748B",
    }]}>
      {/* Players row */}
      <View style={styles.playersRow}>
        {/* Player 1 */}
        <Pressable
          onPress={() => router.push({ pathname: "/player/[id]", params: { id: player1.id } })}
          style={styles.playerSide}
        >
          <View style={[styles.avatarWrap, p1Dominant && { borderColor: colors.tint + "88", borderWidth: 2 }]}>
            <PlayerAvatar name={player1.name} color={player1.avatarColor} size={52} fontSize={18} />
          </View>
          <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
            {player1.name.split(" ")[0]}
          </Text>
          <View style={[styles.winsBadge, {
            backgroundColor: p1Dominant ? colors.tint + "20" : isDark ? "rgba(255,255,255,0.06)" : colors.backgroundSecondary,
          }]}>
            <Text style={[styles.winsNum, { color: p1Dominant ? colors.tint : colors.textSecondary }]}>
              {player1Wins}
            </Text>
            <Text style={[styles.winsLabel, { color: p1Dominant ? colors.tint : colors.textMuted }]}>wins</Text>
          </View>
        </Pressable>

        {/* VS divider */}
        <View style={styles.vsDivider}>
          <View style={[styles.vsCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.backgroundSecondary }]}>
            <Text style={[styles.vsText, { color: colors.textMuted }]}>VS</Text>
          </View>
          <Text style={[styles.totalText, { color: colors.textMuted }]}>{total} {total === 1 ? "match" : "matches"}</Text>
        </View>

        {/* Player 2 */}
        <Pressable
          onPress={() => router.push({ pathname: "/player/[id]", params: { id: player2.id } })}
          style={[styles.playerSide, { alignItems: "flex-end" }]}
        >
          <View style={[styles.avatarWrap, p2Dominant && { borderColor: colors.tint + "88", borderWidth: 2 }]}>
            <PlayerAvatar name={player2.name} color={player2.avatarColor} size={52} fontSize={18} />
          </View>
          <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
            {player2.name.split(" ")[0]}
          </Text>
          <View style={[styles.winsBadge, {
            backgroundColor: p2Dominant ? colors.tint + "20" : isDark ? "rgba(255,255,255,0.06)" : colors.backgroundSecondary,
          }]}>
            <Text style={[styles.winsNum, { color: p2Dominant ? colors.tint : colors.textSecondary }]}>
              {player2Wins}
            </Text>
            <Text style={[styles.winsLabel, { color: p2Dominant ? colors.tint : colors.textMuted }]}>wins</Text>
          </View>
        </Pressable>
      </View>

      {/* Win bar */}
      <View style={[styles.winBar, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.backgroundSecondary }]}>
        <View style={[styles.winBarFill, { flex: p1WinPct, backgroundColor: player1.avatarColor + "CC" }]} />
        {!tied && <View style={{ width: 1, backgroundColor: colors.background }} />}
        <View style={[styles.winBarFill, { flex: p2WinPct, backgroundColor: player2.avatarColor + "CC" }]} />
      </View>

      {/* Leader label */}
      {!tied && (
        <Text style={[styles.leaderText, { color: colors.textMuted }]}>
          {p1Dominant ? player1.name.split(" ")[0] : player2.name.split(" ")[0]} leads {Math.max(player1Wins, player2Wins)}–{Math.min(player1Wins, player2Wins)}
        </Text>
      )}
      {tied && total > 0 && (
        <Text style={[styles.leaderText, { color: colors.textMuted }]}>All square — {player1Wins} each</Text>
      )}
    </View>
  );
}

export default function RivalsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: rivalries = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["rivalries"],
    queryFn: fetchRivalries,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const topPadding = isWeb ? insets.top + 67 : insets.top + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.tint} colors={[colors.tint]} />}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Rivalries</Text>
            {rivalries.length > 0 && (
              <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
                Top {rivalries.length} {rivalries.length === 1 ? "rivalry" : "rivalries"}
              </Text>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.list}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.tint} size="large" />
            </View>
          ) : rivalries.length === 0 ? (
            <View style={[styles.emptyBox, {
              backgroundColor: colors.card,
              borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border,
            }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.tint + "15" }]}>
                <Feather name="zap" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No rivalries yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Rivalries form once players have faced each other. Log some matches to see them here.
              </Text>
            </View>
          ) : (
            rivalries.map((rivalry: any, i: number) => (
              <RivalryCard key={`${rivalry.player1.id}-${rivalry.player2.id}`} rivalry={rivalry} colors={colors} isDark={isDark} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  list: { paddingHorizontal: 16, gap: 12 },
  loadingBox: { paddingVertical: 60, alignItems: "center" },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  playersRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  playerSide: {
    flex: 1,
    alignItems: "flex-start",
    gap: 6,
  },
  avatarWrap: {
    borderRadius: 30,
    padding: 2,
  },
  playerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
  winsBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  winsNum: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  winsLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  vsDivider: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
  },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  vsText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  totalText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  winBar: {
    height: 6,
    borderRadius: 3,
    flexDirection: "row",
    overflow: "hidden",
  },
  winBarFill: {
    height: "100%",
  },
  leaderText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  emptyBox: {
    alignItems: "center",
    padding: 44,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
    borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
