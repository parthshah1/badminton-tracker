import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { MatchCard } from "@/components/MatchCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";
const PAGE_SIZE = 20;

type MatchTypeFilter = "all" | "singles" | "doubles";

async function fetchPlayers() {
  const res = await fetch(`${BASE}/api/players`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any[]>;
}

function DeletableMatchCard({ match, colors, isDark, onDelete }: { match: any; colors: any; isDark: boolean; onDelete: (id: number) => void; }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isWeb = Platform.OS === "web";

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -160));
        else if (g.dx > 0) translateX.setValue(Math.min(g.dx, 0));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80) {
          Animated.spring(translateX, { toValue: -160, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const confirmDelete = () => {
    Alert.alert("Delete Match", "Delete this match? This will affect player stats and Elo ratings.", [
      { text: "Cancel", style: "cancel", onPress: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start() },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onDelete(match.id);
        },
      },
    ]);
  };

  if (isWeb) {
    return (
      <View style={styles.webRow}>
        <View style={{ flex: 1 }}><MatchCard {...match} /></View>
        <Pressable
          onPress={() => router.push({ pathname: "/edit-match", params: { id: match.id } })}
          style={({ pressed }) => [styles.webActionBtn, { backgroundColor: colors.tint + "15", opacity: pressed ? 0.7 : 1 }]}
          hitSlop={8}
        >
          <Feather name="edit-2" size={16} color={colors.tint} />
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          style={({ pressed }) => [styles.webActionBtn, { backgroundColor: colors.danger + "15", opacity: pressed ? 0.7 : 1 }]}
          hitSlop={8}
        >
          <Feather name="trash-2" size={16} color={colors.danger} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ position: "relative" }}>
      <View style={styles.swipeActions}>
        <Pressable
          onPress={() => {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
            router.push({ pathname: "/edit-match", params: { id: match.id } });
          }}
          style={[styles.swipeActionBtn, { backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)" }]}
        >
          <Feather name="edit-2" size={18} color={colors.tint} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.tint }}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          style={[styles.swipeActionBtn, { backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)" }]}
        >
          <Feather name="trash-2" size={18} color={colors.danger} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.danger }}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <MatchCard {...match} />
      </Animated.View>
    </View>
  );
}

export default function MatchesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const [matchTypeFilter, setMatchTypeFilter] = useState<MatchTypeFilter>("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: players = [] } = useQuery({ queryKey: ["players"], queryFn: fetchPlayers });

  const buildUrl = (off: number) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) });
    if (matchTypeFilter !== "all") params.set("matchType", matchTypeFilter);
    if (selectedPlayerId !== null) params.set("playerId", String(selectedPlayerId));
    return `${BASE}/api/matches?${params.toString()}`;
  };

  const loadMatches = async (reset: boolean) => {
    const currentOffset = reset ? 0 : offset;
    setLoading(true);
    try {
      const res = await fetch(buildUrl(currentOffset));
      if (!res.ok) throw new Error("Failed");
      const data: any[] = await res.json();
      setMatches(prev => reset ? data : [...prev, ...data]);
      setOffset(currentOffset + data.length);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMatches(true);
    setRefreshing(false);
  };

  useEffect(() => {
    loadMatches(true);
  }, [matchTypeFilter, selectedPlayerId]);

  const handleDeleteMatch = async (id: number) => {
    await fetch(`${BASE}/api/matches/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["players"] });
    queryClient.invalidateQueries({ queryKey: ["playerStats"] });
    setMatches(prev => prev.filter(m => m.id !== id));
  };

  const topPadding = isWeb ? insets.top + 67 : insets.top + 16;

  const FILTER_LABELS: Record<MatchTypeFilter, string> = {
    all: "All",
    singles: "Singles",
    doubles: "Doubles",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} colors={[colors.tint]} />}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Matches</Text>
            {matches.length > 0 && (
              <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
                {matches.length}{hasMore ? "+" : ""} {matches.length === 1 ? "match" : "matches"}
              </Text>
            )}
          </View>
        </View>

        {/* Type filter pills */}
        <View style={styles.filterPills}>
          {(["all", "singles", "doubles"] as MatchTypeFilter[]).map(type => {
            const active = matchTypeFilter === type;
            return (
              <Pressable
                key={type}
                onPress={() => setMatchTypeFilter(type)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.tint : (isDark ? "rgba(255,255,255,0.07)" : colors.backgroundSecondary),
                    borderColor: active ? colors.tint : "transparent",
                  },
                ]}
              >
                <Text style={[styles.filterPillText, { color: active ? "#fff" : colors.textSecondary }]}>
                  {FILTER_LABELS[type]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Player filter */}
        {players.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playerFilterScroll}>
            <Pressable
              onPress={() => setSelectedPlayerId(null)}
              style={[
                styles.playerChip,
                {
                  backgroundColor: selectedPlayerId === null ? colors.tint + "20" : colors.card,
                  borderColor: selectedPlayerId === null ? colors.tint : (isDark ? "rgba(255,255,255,0.08)" : colors.border),
                },
              ]}
            >
              <Text style={[styles.playerChipText, { color: selectedPlayerId === null ? colors.tint : colors.textSecondary }]}>
                All Players
              </Text>
            </Pressable>
            {(players as any[]).map((p: any) => {
              const selected = selectedPlayerId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedPlayerId(selected ? null : p.id)}
                  style={[
                    styles.playerChip,
                    {
                      backgroundColor: selected ? colors.tint + "20" : colors.card,
                      borderColor: selected ? colors.tint : (isDark ? "rgba(255,255,255,0.08)" : colors.border),
                    },
                  ]}
                >
                  <PlayerAvatar name={p.name} color={p.avatarColor} size={20} fontSize={8} />
                  <Text style={[styles.playerChipText, { color: selected ? colors.tint : colors.textSecondary }]} numberOfLines={1}>
                    {p.name.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Match list */}
        <View style={styles.list}>
          {loading && matches.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.tint} size="large" />
            </View>
          ) : matches.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.tint + "15" }]}>
                <Feather name="clock" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No matches found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                {matchTypeFilter !== "all" || selectedPlayerId !== null
                  ? "Try adjusting your filters"
                  : "Log your first match from the Home tab"}
              </Text>
            </View>
          ) : (
            <>
              {matches.map(match => (
                <DeletableMatchCard key={match.id} match={match} colors={colors} isDark={isDark} onDelete={handleDeleteMatch} />
              ))}
              {hasMore && (
                <Pressable
                  onPress={() => loadMatches(false)}
                  disabled={loading}
                  style={[styles.loadMoreBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.backgroundSecondary }]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                  ) : (
                    <Text style={[styles.loadMoreText, { color: colors.tint }]}>Load more</Text>
                  )}
                </Pressable>
              )}
            </>
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
  filterPills: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  playerFilterScroll: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  playerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  playerChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { paddingHorizontal: 16, gap: 10 },
  loadingBox: { paddingVertical: 60, alignItems: "center" },
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
  loadMoreBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  loadMoreText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  webRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  webActionBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  swipeActions: {
    position: "absolute", right: 0, top: 0, bottom: 0, width: 160,
    flexDirection: "row", borderRadius: 16, overflow: "hidden",
  },
  swipeActionBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
});
