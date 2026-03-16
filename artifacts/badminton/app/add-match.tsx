import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { PlayerAvatar } from "@/components/PlayerAvatar";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

async function fetchPlayers() {
  const res = await fetch(`${BASE}/api/players`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<any[]>;
}

type MatchType = "singles" | "doubles";

export default function AddMatchScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [matchType, setMatchType] = useState<MatchType>("singles");
  const [team1Ids, setTeam1Ids] = useState<number[]>([]);
  const [team2Ids, setTeam2Ids] = useState<number[]>([]);
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const playersQuery = useQuery({ queryKey: ["players"], queryFn: fetchPlayers });
  const players = playersQuery.data ?? [];

  const maxPerTeam = matchType === "singles" ? 1 : 2;

  const togglePlayer = (playerId: number, team: 1 | 2) => {
    if (team === 1) {
      if (team1Ids.includes(playerId)) {
        setTeam1Ids(prev => prev.filter(id => id !== playerId));
      } else if (team1Ids.length < maxPerTeam && !team2Ids.includes(playerId)) {
        setTeam1Ids(prev => [...prev, playerId]);
      }
    } else {
      if (team2Ids.includes(playerId)) {
        setTeam2Ids(prev => prev.filter(id => id !== playerId));
      } else if (team2Ids.length < maxPerTeam && !team1Ids.includes(playerId)) {
        setTeam2Ids(prev => [...prev, playerId]);
      }
    }
  };

  const MAX_SCORE = 30;

  const isValid = () => {
    const s1 = parseInt(team1Score);
    const s2 = parseInt(team2Score);
    if (team1Ids.length !== maxPerTeam || team2Ids.length !== maxPerTeam) return false;
    if (isNaN(s1) || isNaN(s2)) return false;
    if (s1 === s2) return false;
    if (s1 < 0 || s2 < 0) return false;
    if (s1 > MAX_SCORE || s2 > MAX_SCORE) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchType,
          team1PlayerIds: team1Ids,
          team2PlayerIds: team2Ids,
          team1Score: parseInt(team1Score),
          team2Score: parseInt(team2Score),
          notes: notes.trim() || undefined,
          playedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save match");
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      router.back();
    } catch (e) {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const team1Players = players.filter(p => team1Ids.includes(p.id));
  const team2Players = players.filter(p => team2Ids.includes(p.id));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Log Match</Text>
        <Pressable
          onPress={handleSubmit}
          disabled={!isValid() || loading}
          style={({ pressed }) => ({ opacity: pressed || !isValid() ? 0.4 : 1 })}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <Text style={[styles.saveBtn, { color: colors.tint }]}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Match type */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Match Type</Text>
          <View style={[styles.segmented, { backgroundColor: colors.backgroundSecondary }]}>
            {(["singles", "doubles"] as MatchType[]).map((type) => (
              <Pressable
                key={type}
                onPress={() => {
                  setMatchType(type);
                  setTeam1Ids([]);
                  setTeam2Ids([]);
                }}
                style={[
                  styles.segment,
                  matchType === type && { backgroundColor: colors.card },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: matchType === type ? colors.text : colors.textMuted },
                  ]}
                >
                  {type === "singles" ? "Singles (1v1)" : "Doubles (2v2)"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Score */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Score</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreTeamBlock}>
              <View style={styles.scoreAvatarRow}>
                {team1Players.length > 0 ? (
                  team1Players.map(p => (
                    <PlayerAvatar key={p.id} name={p.name} color={p.avatarColor} size={28} fontSize={11} />
                  ))
                ) : (
                  <View style={[styles.emptyAvatar, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.emptyAvatarText, { color: colors.textMuted }]}>
                      {matchType === "singles" ? "P1" : "T1"}
                    </Text>
                  </View>
                )}
              </View>
              <TextInput
                value={team1Score}
                onChangeText={(v) => {
                  const n = parseInt(v);
                  if (v === "" || (isNaN(n) === false && n <= MAX_SCORE)) setTeam1Score(v);
                }}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={[styles.scoreInput, { backgroundColor: colors.card, color: colors.team1, borderColor: colors.team1 + "44" }]}
                maxLength={2}
              />
            </View>

            <Text style={[styles.scoreDivider, { color: colors.textMuted }]}>vs</Text>

            <View style={styles.scoreTeamBlock}>
              <View style={styles.scoreAvatarRow}>
                {team2Players.length > 0 ? (
                  team2Players.map(p => (
                    <PlayerAvatar key={p.id} name={p.name} color={p.avatarColor} size={28} fontSize={11} />
                  ))
                ) : (
                  <View style={[styles.emptyAvatar, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.emptyAvatarText, { color: colors.textMuted }]}>
                      {matchType === "singles" ? "P2" : "T2"}
                    </Text>
                  </View>
                )}
              </View>
              <TextInput
                value={team2Score}
                onChangeText={(v) => {
                  const n = parseInt(v);
                  if (v === "" || (isNaN(n) === false && n <= MAX_SCORE)) setTeam2Score(v);
                }}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={[styles.scoreInput, { backgroundColor: colors.card, color: colors.team2, borderColor: colors.team2 + "44" }]}
                maxLength={2}
              />
            </View>
          </View>
          {team1Score && team2Score && team1Score === team2Score && (
            <Text style={[styles.tieWarning, { color: colors.warning }]}>Scores cannot be tied</Text>
          )}
          {((team1Score && parseInt(team1Score) > MAX_SCORE) || (team2Score && parseInt(team2Score) > MAX_SCORE)) && (
            <Text style={[styles.tieWarning, { color: colors.danger }]}>Maximum score is {MAX_SCORE}</Text>
          )}
        </View>

        {/* Player selection */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Select Players (tap to assign teams)
          </Text>
          {playersQuery.isLoading ? (
            <ActivityIndicator color={colors.tint} />
          ) : players.length < 2 ? (
            <View style={[styles.noPlayersBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.noPlayersText, { color: colors.textMuted }]}>
                Add at least 2 players first
              </Text>
              <Pressable onPress={() => { router.back(); router.push("/add-player"); }}>
                <Text style={[styles.addPlayerLink, { color: colors.tint }]}>+ Add Players</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.playerPicker}>
              <View style={styles.teamsHeader}>
                <View style={[styles.teamLabel, { backgroundColor: colors.team1 + "22" }]}>
                  <View style={[styles.teamDot, { backgroundColor: colors.team1 }]} />
                  <Text style={[styles.teamLabelText, { color: colors.team1 }]}>Team 1</Text>
                  <Text style={[styles.teamCount, { color: colors.team1 }]}>
                    {team1Ids.length}/{maxPerTeam}
                  </Text>
                </View>
                <View style={[styles.teamLabel, { backgroundColor: colors.team2 + "22" }]}>
                  <View style={[styles.teamDot, { backgroundColor: colors.team2 }]} />
                  <Text style={[styles.teamLabelText, { color: colors.team2 }]}>Team 2</Text>
                  <Text style={[styles.teamCount, { color: colors.team2 }]}>
                    {team2Ids.length}/{maxPerTeam}
                  </Text>
                </View>
              </View>
              <View style={styles.playerGrid}>
                {players.map((player) => {
                  const inTeam1 = team1Ids.includes(player.id);
                  const inTeam2 = team2Ids.includes(player.id);
                  const assigned = inTeam1 || inTeam2;
                  const teamColor = inTeam1 ? colors.team1 : inTeam2 ? colors.team2 : null;

                  return (
                    <View key={player.id} style={styles.playerPickerItem}>
                      <Pressable
                        onPress={() => togglePlayer(player.id, 1)}
                        style={[
                          styles.teamBtn,
                          {
                            backgroundColor: inTeam1 ? colors.team1 : colors.backgroundSecondary,
                            opacity: (!inTeam1 && team1Ids.length >= maxPerTeam) || inTeam2 ? 0.35 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.teamBtnText, { color: inTeam1 ? "#fff" : colors.textMuted }]}>T1</Text>
                      </Pressable>
                      <View style={styles.playerPickerCenter}>
                        <PlayerAvatar name={player.name} color={player.avatarColor} size={40} fontSize={14} />
                        <Text style={[styles.playerPickerName, { color: colors.text }]} numberOfLines={1}>
                          {player.name.split(" ")[0]}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => togglePlayer(player.id, 2)}
                        style={[
                          styles.teamBtn,
                          {
                            backgroundColor: inTeam2 ? colors.team2 : colors.backgroundSecondary,
                            opacity: (!inTeam2 && team2Ids.length >= maxPerTeam) || inTeam1 ? 0.35 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.teamBtnText, { color: inTeam2 ? "#fff" : colors.textMuted }]}>T2</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Notes (optional)</Text>
            <Text style={[styles.charCount, { color: notes.length > 180 ? colors.danger : colors.textMuted }]}>
              {notes.length}/200
            </Text>
          </View>
          <TextInput
            value={notes}
            onChangeText={(v) => v.length <= 200 && setNotes(v)}
            placeholder="e.g. Best match ever!"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.notesInput,
              { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
            ]}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={!isValid() || loading}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: isValid() ? colors.tint : colors.backgroundSecondary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.submitBtnText, { color: isValid() ? "#fff" : colors.textMuted }]}>
              Save Match
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  scoreTeamBlock: {
    flex: 1,
    alignItems: "center",
    gap: 10,
  },
  scoreAvatarRow: {
    flexDirection: "row",
    gap: 4,
    minHeight: 28,
  },
  emptyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAvatarText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  scoreInput: {
    width: "100%",
    textAlign: "center",
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 16,
  },
  scoreDivider: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    marginTop: 28,
  },
  tieWarning: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  noPlayersBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  noPlayersText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  addPlayerLink: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  playerPicker: {
    gap: 14,
  },
  teamsHeader: {
    flexDirection: "row",
    gap: 8,
  },
  teamLabel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  teamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamLabelText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  teamCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  playerGrid: {
    gap: 8,
  },
  playerPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  teamBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  teamBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  playerPickerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playerPickerName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  submitBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
});
