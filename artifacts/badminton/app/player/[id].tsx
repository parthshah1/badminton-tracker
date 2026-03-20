import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors, { AVATAR_COLORS } from "@/constants/colors";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { MatchCard } from "@/components/MatchCard";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

async function fetchPlayerStats(id: string) {
  const res = await fetch(`${BASE}/api/players/${id}/stats`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any>;
}

async function fetchH2H(id: string) {
  const res = await fetch(`${BASE}/api/players/${id}/h2h`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any[]>;
}

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["playerStats", id],
    queryFn: () => fetchPlayerStats(id!),
    enabled: !!id,
  });

  const { data: h2hData } = useQuery({
    queryKey: ["h2h", id],
    queryFn: () => fetchH2H(id!),
    enabled: !!id,
  });
  const h2h = h2hData ?? [];

  const openEdit = () => {
    setEditName(stats?.playerName ?? "");
    setEditColor(stats?.avatarColor ?? AVATAR_COLORS[0]);
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setEditLoading(true);
    try {
      await fetch(`${BASE}/api/players/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), avatarColor: editColor }),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["playerStats", id] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      setEditVisible(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Player",
      `Are you sure you want to delete ${stats?.playerName}? Their match history will be removed from match records.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await fetch(`${BASE}/api/players/${id}`, { method: "DELETE" });
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              queryClient.invalidateQueries({ queryKey: ["players"] });
              queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
              queryClient.invalidateQueries({ queryKey: ["matches"] });
              router.back();
            } finally {
              setDeleteLoading(false);
            }
          },
        },
      ]
    );
  };

  const topPadding = isWeb ? insets.top + 67 : insets.top;
  const topBarHeight = topPadding + 52;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={[styles.center, { paddingTop: topBarHeight + 40 }]}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      ) : error || !stats ? (
        <View style={[styles.center, { paddingTop: topBarHeight + 40 }]}>
          <Feather name="alert-circle" size={32} color={colors.textMuted} />
          <Text style={[styles.errorMsg, { color: colors.textMuted }]}>Could not load player</Text>
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }}
        >
          {/* Gradient Hero */}
          <LinearGradient
            colors={[stats.avatarColor + "55", stats.avatarColor + "22", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.heroGradient, { paddingTop: topBarHeight + 8 }]}
          >
            {/* Hero content */}
            <View style={styles.heroContent}>
              <View style={[styles.avatarRing, { borderColor: stats.avatarColor + "66" }]}>
                <PlayerAvatar
                  name={stats.playerName}
                  color={stats.avatarColor}
                  size={80}
                  fontSize={28}
                />
              </View>
              <Text style={[styles.heroName, { color: isDark ? "#fff" : colors.text }]}>
                {stats.playerName}
              </Text>
              <Text style={[styles.heroSubtitle, { color: isDark ? "rgba(255,255,255,0.6)" : colors.textSecondary }]}>
                {stats.totalMatches} {stats.totalMatches === 1 ? "match" : "matches"} played
              </Text>

              <View style={styles.heroBadges}>
                <View style={[styles.heroBadge, { backgroundColor: colors.tint + "25" }]}>
                  <Text style={[styles.heroBadgeValue, { color: colors.tint }]}>
                    {Math.round(stats.winRate * 100)}%
                  </Text>
                  <Text style={[styles.heroBadgeLabel, { color: colors.tint + "BB" }]}>WIN</Text>
                </View>
                {stats.elo !== undefined && (
                  <View style={[styles.heroBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.07)" }]}>
                    <Text style={[styles.heroBadgeValue, { color: isDark ? "#fff" : colors.text }]}>
                      {stats.elo}
                    </Text>
                    <Text style={[styles.heroBadgeLabel, { color: colors.textMuted }]}>ELO</Text>
                  </View>
                )}
                {stats.currentWinStreak >= 2 && (
                  <View style={[styles.heroBadge, { backgroundColor: "#FEF3C7" }]}>
                    <Text style={[styles.heroBadgeValue, { color: "#D97706" }]}>
                      🔥{stats.currentWinStreak}
                    </Text>
                    <Text style={[styles.heroBadgeLabel, { color: "#92400E" }]}>STREAK</Text>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>

          <View style={styles.body}>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <StatCard label="Wins" value={stats.wins} color={colors.tint} colors={colors} />
              <StatCard label="Losses" value={stats.losses} color={colors.danger} colors={colors} />
              <StatCard label="Win Streak" value={stats.currentWinStreak} color="#F59E0B" colors={colors} />
              <StatCard label="Best Streak" value={stats.longestWinStreak} color="#8B5CF6" colors={colors} />
            </View>

            {/* Breakdown */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border }]}>
              <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Format Breakdown</Text>
              <View style={styles.breakdownRow}>
                <BreakdownItem
                  label="Singles"
                  wins={stats.singlesWins}
                  losses={stats.singlesLosses}
                  colors={colors}
                />
                <View style={[styles.breakdownDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : colors.border }]} />
                <BreakdownItem
                  label="Doubles"
                  wins={stats.doublesWins}
                  losses={stats.doublesLosses}
                  colors={colors}
                />
              </View>
            </View>

            {/* Head-to-Head */}
            {h2h.length > 0 && (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Head-to-Head</Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border, gap: 0 }]}>
                  {h2h.map((opp: any, idx: number) => {
                    const total = opp.wins + opp.losses;
                    const winPct = total > 0 ? opp.wins / total : 0;
                    const isWinning = opp.wins > opp.losses;
                    const isTied = opp.wins === opp.losses;
                    return (
                      <View key={opp.opponentId}>
                        {idx > 0 && <View style={[styles.h2hDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.border }]} />}
                        <View style={styles.h2hRow}>
                          <PlayerAvatar name={opp.opponentName} color={opp.opponentAvatarColor} size={38} fontSize={14} />
                          <View style={styles.h2hInfo}>
                            <View style={styles.h2hNameRow}>
                              <Text style={[styles.h2hName, { color: colors.text }]}>{opp.opponentName}</Text>
                              <View style={[
                                styles.h2hResultPill,
                                { backgroundColor: isWinning ? colors.tint + "18" : isTied ? colors.backgroundSecondary : colors.danger + "12" }
                              ]}>
                                <Text style={[
                                  styles.h2hResultText,
                                  { color: isWinning ? colors.tint : isTied ? colors.textSecondary : colors.danger }
                                ]}>
                                  {isWinning ? "Winning" : isTied ? "Tied" : "Losing"}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.h2hBarRow}>
                              <Text style={[styles.h2hRecord, { color: colors.textMuted }]}>
                                {opp.wins}W – {opp.losses}L
                              </Text>
                              <View style={[styles.h2hBar, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : colors.border }]}>
                                {total > 0 && (
                                  <View style={[styles.h2hBarFill, { width: `${winPct * 100}%`, backgroundColor: isWinning ? colors.tint : colors.danger }]} />
                                )}
                              </View>
                              <Text style={[styles.h2hPct, { color: colors.textMuted }]}>{Math.round(winPct * 100)}%</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

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
          </View>
        </ScrollView>
      )}

      {/* Floating top bar - always visible over scroll content */}
      <View style={[styles.topBar, { paddingTop: topPadding, top: 0 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.85)", borderColor: "transparent" }]}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={20} color={isDark ? "#fff" : colors.text} />
        </Pressable>
        {!isLoading && stats && (
          <View style={styles.topBarActions}>
            <Pressable
              onPress={openEdit}
              style={[styles.iconBtn, { backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.85)", borderColor: "transparent" }]}
              hitSlop={12}
            >
              <Feather name="edit-2" size={18} color={isDark ? "#fff" : colors.text} />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={[styles.iconBtn, { backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.85)", borderColor: "transparent" }]}
              hitSlop={12}
            >
              {deleteLoading ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Feather name="trash-2" size={18} color={colors.danger} />
              )}
            </Pressable>
          </View>
        )}
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
            <Pressable onPress={() => setEditVisible(false)} hitSlop={12}>
              <Feather name="x" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Player</Text>
            <Pressable
              onPress={handleSaveEdit}
              disabled={editName.trim().length < 2 || editLoading}
              style={({ pressed }) => ({ opacity: pressed || !editName.trim() ? 0.4 : 1 })}
            >
              {editLoading ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Text style={[styles.saveText, { color: colors.tint }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.previewSection}>
              <PlayerAvatar name={editName || "?"} color={editColor} size={80} fontSize={28} />
              <Text style={[styles.previewName, { color: colors.text }]}>
                {editName || "Enter a name"}
              </Text>
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
                <Text style={[styles.charCount, { color: editName.length > 25 ? colors.danger : colors.textMuted }]}>
                  {editName.length}/30
                </Text>
              </View>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Player name"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: editName.trim().length > 0 && editName.trim().length < 2 ? colors.danger : colors.border,
                  },
                ]}
                autoFocus
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={handleSaveEdit}
              />
              {editName.trim().length > 0 && editName.trim().length < 2 && (
                <Text style={[styles.hint, { color: colors.danger }]}>At least 2 characters required</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Avatar Color</Text>
              <View style={styles.colorGrid}>
                {AVATAR_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setEditColor(color)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      editColor === color && styles.colorDotSelected,
                    ]}
                  >
                    {editColor === color && <Feather name="check" size={16} color="#fff" />}
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StatCard({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function BreakdownItem({ label, wins, losses, colors }: { label: string; wins: number; losses: number; colors: any }) {
  const total = wins + losses;
  return (
    <View style={styles.breakdownItem}>
      <Text style={[styles.breakdownType, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.breakdownScore, { color: colors.text }]}>
        {wins}W – {losses}L
      </Text>
      <View style={[styles.miniBar, { backgroundColor: colors.border }]}>
        {total > 0 && (
          <View
            style={[
              styles.miniBarFill,
              {
                backgroundColor: colors.tint,
                width: `${(wins / total) * 100}%`,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  heroGradient: {
    paddingBottom: 28,
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  topBarActions: {
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  heroBadges: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  heroBadgeValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  heroBadgeLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  body: {
    padding: 16,
    gap: 20,
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
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  sectionCardTitle: {
    fontSize: 15,
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
    letterSpacing: -0.3,
  },
  miniBar: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  miniBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  breakdownDivider: { width: 1 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  h2hDivider: { height: 1 },
  h2hRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  h2hInfo: { flex: 1, gap: 6 },
  h2hNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  h2hName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  h2hResultPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  h2hResultText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  h2hBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  h2hRecord: { fontSize: 12, fontFamily: "Inter_500Medium", width: 64 },
  h2hBar: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  h2hBarFill: { height: "100%", borderRadius: 3 },
  h2hPct: { fontSize: 12, fontFamily: "Inter_500Medium", width: 32, textAlign: "right" },
  matchList: { gap: 10 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  saveText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  modalContent: {
    padding: 24,
    gap: 28,
  },
  previewSection: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  previewName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  field: { gap: 10 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontFamily: "Inter_400Regular",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: "#fff",
  },
});
