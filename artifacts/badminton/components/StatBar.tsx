import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import Colors from "@/constants/colors";

interface StatBarProps {
  wins: number;
  losses: number;
}

export function StatBar({ wins, losses }: StatBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const total = wins + losses;
  const winPct = total > 0 ? wins / total : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labels}>
        <Text style={[styles.label, { color: colors.tint }]}>{wins}W</Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>{losses}L</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        {total > 0 && (
          <View
            style={[styles.fill, { backgroundColor: colors.tint, width: `${winPct * 100}%` }]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
