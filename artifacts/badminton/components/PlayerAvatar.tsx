import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface PlayerAvatarProps {
  name: string;
  color: string;
  size?: number;
  fontSize?: number;
}

export function PlayerAvatar({ name, color, size = 40, fontSize = 16 }: PlayerAvatarProps) {
  const initials = name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    lineHeight: undefined,
  },
});
