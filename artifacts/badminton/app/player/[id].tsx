import { Feather } from "@expo/vector-icons";
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: isWeb ? insets.top + 67 : insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        {!isLoading && stats && (
          <View style={styles.topBarActions}>
            <Pressable
              onPress={openEdit}
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              hitSlop={12}
            >
              <Feather name="edit-2" size={18} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={[styles.iconBtn, { backgroundColor: colors.danger + "15", borderColor: colors.danger + "30" }]}
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
            {/* Preview */}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  breakdownDivider: { width: 1 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
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
