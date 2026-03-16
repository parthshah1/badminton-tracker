import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PanResponder } from "react-native";
import { MatchCard } from "./MatchCard";

interface SwipeableMatchCardProps {
  match: any;
  colors: any;
  onDelete: (id: number) => void;
}

const SWIPE_THRESHOLD = -80;

export function SwipeableMatchCard({ match, colors, onDelete }: SwipeableMatchCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isWeb = Platform.OS === "web";

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -100));
        } else if (gestureState.dx > 0) {
          translateX.setValue(Math.min(gestureState.dx, 0));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const resetSwipe = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete Match",
      "Are you sure you want to delete this match? This will affect player stats.",
      [
        { text: "Cancel", style: "cancel", onPress: resetSwipe },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDelete(match.id);
          },
        },
      ]
    );
  };

  if (isWeb) {
    return (
      <View style={styles.row}>
        <View style={styles.cardWrapper}>
          <MatchCard {...match} />
        </View>
        <Pressable
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.webDeleteBtn,
            { backgroundColor: colors.danger + "15", opacity: pressed ? 0.7 : 1 },
          ]}
          hitSlop={8}
        >
          <Feather name="trash-2" size={18} color={colors.danger} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.swipeContainer}>
      {/* Delete button underneath */}
      <View style={[styles.deleteUnderlay, { backgroundColor: colors.danger + "15" }]}>
        <Pressable onPress={confirmDelete} style={styles.deleteAction}>
          <Feather name="trash-2" size={22} color={colors.danger} />
          <Text style={[styles.deleteLabel, { color: colors.danger }]}>Delete</Text>
        </Pressable>
      </View>
      {/* Card (swipeable) */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <MatchCard {...match} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: "relative",
  },
  deleteUnderlay: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteAction: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
  },
  deleteLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  // Web layout
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardWrapper: {
    flex: 1,
  },
  webDeleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
