import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
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

async function fetchLeaderboard() {
  const res = await fetch(`${BASE}/api/stats/leaderboard`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any[]>;
}

async function fetchTeams() {
  const res = await fetch(`${BASE}/api/stats/teams`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any[]>;
}

const MEDALS = [
  { color: "#F59E0B", label: "Gold", emoji: "🥇" },
  { color: "#94A3B8", label: "Silver", emoji: "🥈" },
  { color: "#CD7F32", label: "Bronze", emoji: "🥉" },
];

function FormDots({ form, size = 7 }: { form: string[]; size?: number }) {
  if (!form || form.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }}>
      {form.map((result, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: result === "W" ? "#22C55E" : "#EF4444",
          }}
        />
      ))}
    </View>
  );
}

export default function LeaderboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [activeTab, setActiveTab] = useState<"players" | "teams">("players");

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const players = data ?? [];
  const teams = teamsQuery.data ?? [];
  const topPadding = isWeb ? insets.top + 67 : insets.top + 16;
  const isTeamsLoading = teamsQuery.isLoading;
  const handleRefresh = () => { refetch(); teamsQuery.refetch(); };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || teamsQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
      >
        <View style={[styles.pageHeader, { paddingTop: topPadding }]}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Leaderboard</Text>
        </View>

        <View style={[styles.tabSwitcher, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.backgroundSecondary, marginHorizontal: 20, marginBottom: 8 }]}>
          {(["players", "teams"] as const).map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabSwitcherBtn,
                activeTab === tab && {
                  backgroundColor: colors.card,
                  shadowColor: isDark ? "#000" : "#94A3B8",
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 2,
                },
              ]}
            >
              <Text style={[styles.tabSwitcherText, { color: activeTab === tab ? colors.text : colors.textMuted }]}>
                {tab === "players" ? "Players" : "Teams"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "players" ? (
          isLoading ? (
            <View style={styles.loadingBox}><ActivityIndicator color={colors.tint} size="large" /></View>
          ) : players.length === 0 ? (
            <EmptyState icon="award" title="No rankings yet" subtitle="Add players and log matches to build the leaderboard" colors={colors} isDark={isDark} />
          ) : (
            <>
              {players.length >= 2 && (
                <PodiumSection players={players} colors={colors} isDark={isDark} />
              )}
              <View style={styles.listSection}>
                <Text style={[styles.listTitle, { color: colors.text }]}>All Players</Text>
                <View style={styles.rankList}>
                  {players.map((player, idx) => (
                    <PlayerRankRow
                      key={player.playerId}
                      player={player}
                      idx={idx}
                      colors={colors}
                      isDark={isDark}
                    />
                  ))}
                </View>
              </View>
            </>
          )
        ) : (
          isTeamsLoading ? (
            <View style={styles.loadingBox}><ActivityIndicator color={colors.tint} size="large" /></View>
          ) : teams.length === 0 ? (
            <EmptyState icon="users" title="No team stats yet" subtitle="Log some doubles matches to see team rankings" colors={colors} isDark={isDark} />
          ) : (
            <View style={styles.listSection}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Top Teams</Text>
              <View style={styles.rankList}>
                {teams.map((team, idx) => (
                  <TeamRankRow key={team.key} team={team} idx={idx} colors={colors} isDark={isDark} />
                ))}
              </View>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

function PodiumSection({ players, colors, isDark }: { players: any[]; colors: any; isDark: boolean }) {
  return (
    <View style={styles.podiumSection}>
      <LinearGradient
        colors={isDark ? ["rgba(255,255,255,0.04)", "transparent"] : ["rgba(0,0,0,0.03)", "transparent"]}
        style={[styles.podiumCard, { borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border }]}
      >
        <Text style={[styles.podiumLabel, { color: colors.textMuted }]}>SEASON RANKINGS</Text>
        <View style={styles.podiumRow}>
          {players.length >= 2 && <PodiumItem player={players[1]} rank={2} colors={colors} isDark={isDark} />}
          <PodiumItem player={players[0]} rank={1} colors={colors} isDark={isDark} />
          {players.length >= 3 && <PodiumItem player={players[2]} rank={3} colors={colors} isDark={isDark} />}
        </View>
      </LinearGradient>
    </View>
  );
}

function PodiumItem({ player, rank, colors, isDark }: { player: any; rank: number; colors: any; isDark: boolean }) {
  const medal = MEDALS[rank - 1];
  const avatarSize = rank === 1 ? 68 : 52;
  const platformH = rank === 1 ? 72 : rank === 2 ? 50 : 34;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.playerId } })}
      style={({ pressed }) => [styles.podiumItem, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={styles.podiumAvatarArea}>
        {rank === 1 && <Text style={styles.crownText}>👑</Text>}
        <PlayerAvatar name={player.playerName} color={player.avatarColor} size={avatarSize} fontSize={rank === 1 ? 24 : 18} />
      </View>
      <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
        {player.playerName.split(" ")[0]}
      </Text>
      <Text style={[styles.podiumRate, { color: medal.color }]}>
        {Math.round(player.winRate * 100)}%
      </Text>
      <View style={[styles.podiumPlatform, { height: platformH, backgroundColor: medal.color + "20", borderColor: medal.color + "50" }]}>
        <Text style={[styles.podiumRankNum, { color: medal.color }]}>{rank}</Text>
      </View>
    </Pressable>
  );
}

function PlayerRankRow({ player, idx, colors, isDark }: { player: any; idx: number; colors: any; isDark: boolean }) {
  const medal = idx < 3 ? MEDALS[idx] : null;
  const isTop = idx === 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.playerId } })}
      style={({ pressed }) => [
        styles.rankRow,
        {
          backgroundColor: colors.card,
          borderColor: isTop ? colors.tint + "35" : (isDark ? "rgba(255,255,255,0.06)" : colors.border),
          shadowColor: isDark ? "#000" : "#64748B",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {isTop && <View style={[styles.topRowAccent, { backgroundColor: colors.tint }]} />}
      <View style={styles.rankLeft}>
        <View style={[
          styles.rankBadge,
          { backgroundColor: medal ? (isDark ? "rgba(255,255,255,0.06)" : "#F8FAFC") : (isDark ? "rgba(255,255,255,0.05)" : colors.backgroundSecondary) },
        ]}>
          {medal ? (
            <Text style={styles.rankMedalEmoji}>{medal.emoji}</Text>
          ) : (
            <Text style={[styles.rankNum, { color: colors.textMuted }]}>{idx + 1}</Text>
          )}
        </View>
        <PlayerAvatar name={player.playerName} color={player.avatarColor} size={44} fontSize={16} />
        <View style={styles.rankInfo}>
          <View style={styles.rankNameRow}>
            <Text style={[styles.rankName, { color: colors.text }]}>{player.playerName}</Text>
            {player.currentWinStreak >= 3 && (
              <View style={[styles.streakPill, { backgroundColor: "#FEF3C7" }]}>
                <Text style={styles.streakPillText}>🔥 {player.currentWinStreak}</Text>
              </View>
            )}
          </View>
          <View style={styles.rankSubRow}>
            <Text style={[styles.rankMatches, { color: colors.textMuted }]}>
              {player.wins}W · {player.losses}L
            </Text>
            {player.recentForm && player.recentForm.length > 0 && (
              <FormDots form={player.recentForm} />
            )}
          </View>
        </View>
      </View>
      <View style={styles.rankRight}>
        <Text style={[styles.winRateLarge, { color: isTop ? colors.tint : colors.text }]}>
          {Math.round(player.winRate * 100)}%
        </Text>
        {player.elo !== undefined && (
          <Text style={[styles.eloText, { color: colors.textMuted }]}>{player.elo} ELO</Text>
        )}
      </View>
    </Pressable>
  );
}

function TeamRankRow({ team, idx, colors, isDark }: { team: any; idx: number; colors: any; isDark: boolean }) {
  const medal = idx < 3 ? MEDALS[idx] : null;
  const isTop = idx === 0;

  return (
    <View style={[
      styles.rankRow,
      {
        backgroundColor: colors.card,
        borderColor: isTop ? colors.tint + "35" : (isDark ? "rgba(255,255,255,0.06)" : colors.border),
        shadowColor: isDark ? "#000" : "#64748B",
      },
    ]}>
      {isTop && <View style={[styles.topRowAccent, { backgroundColor: colors.tint }]} />}
      <View style={styles.rankLeft}>
        <View style={[
          styles.rankBadge,
          { backgroundColor: medal ? (isDark ? "rgba(255,255,255,0.06)" : "#F8FAFC") : (isDark ? "rgba(255,255,255,0.05)" : colors.backgroundSecondary) },
        ]}>
          {medal ? (
            <Text style={styles.rankMedalEmoji}>{medal.emoji}</Text>
          ) : (
            <Text style={[styles.rankNum, { color: colors.textMuted }]}>{idx + 1}</Text>
          )}
        </View>
        <View style={styles.teamAvatarStack}>
          {team.players.map((p: any, pi: number) => (
            <View key={p.playerId} style={pi > 0 ? styles.teamAvatarOverlap : undefined}>
              <PlayerAvatar name={p.playerName} color={p.avatarColor} size={36} fontSize={13} />
            </View>
          ))}
        </View>
        <View style={styles.rankInfo}>
          <Text style={[styles.rankName, { color: colors.text }]} numberOfLines={1}>
            {team.players.map((p: any) => p.playerName.split(" ")[0]).join(" & ")}
          </Text>
          <Text style={[styles.rankMatches, { color: colors.textMuted }]}>
            {team.wins}W · {team.losses}L · {team.total} {team.total === 1 ? "game" : "games"}
          </Text>
        </View>
      </View>
      <View style={styles.rankRight}>
        <Text style={[styles.winRateLarge, { color: isTop ? colors.tint : colors.text }]}>
          {Math.round(team.winRate * 100)}%
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ icon, title, subtitle, colors, isDark }: { icon: any; title: string; subtitle: string; colors: any; isDark: boolean }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border }]}>
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.tint + "15" }]}>
          <Feather name={icon} size={28} color={colors.tint} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 20, paddingBottom: 12 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tabSwitcher: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 2 },
  tabSwitcherBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabSwitcherText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  teamAvatarStack: { flexDirection: "row", alignItems: "center" },
  teamAvatarOverlap: { marginLeft: -8 },
  loadingBox: { paddingVertical: 60, alignItems: "center" },
  emptyWrap: { padding: 20 },
  emptyBox: { alignItems: "center", padding: 44, borderRadius: 20, borderWidth: 1, gap: 10, borderStyle: "dashed" },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  podiumSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  podiumCard: { borderRadius: 20, borderWidth: 1, padding: 20, paddingTop: 16 },
  podiumLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, textAlign: "center", marginBottom: 20 },
  podiumRow: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 12 },
  podiumItem: { flex: 1, alignItems: "center", gap: 6 },
  podiumAvatarArea: { alignItems: "center", gap: 4 },
  crownText: { fontSize: 20 },
  podiumName: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  podiumRate: { fontSize: 14, fontFamily: "Inter_700Bold" },
  podiumPlatform: { width: "100%", borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 },
  podiumRankNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  listSection: { padding: 20, gap: 12 },
  listTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  rankList: { gap: 8 },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  topRowAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  rankLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  rankBadge: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  rankMedalEmoji: { fontSize: 18 },
  rankNum: { fontSize: 15, fontFamily: "Inter_700Bold" },
  rankInfo: { gap: 3, flex: 1 },
  rankNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  rankSubRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rankName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  streakPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  streakPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  rankMatches: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rankRight: { alignItems: "flex-end", gap: 2 },
  winRateLarge: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  eloText: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
});
