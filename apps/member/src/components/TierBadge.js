import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TIER_CONFIG = {
  Seedling: { emoji: '🌱', color: '#52B788', label: 'Level 1 · Seedling' },
  Olive:    { emoji: '🫒', color: '#74C69D', label: 'Level 2 · Olive'    },
  Cedar:    { emoji: '🌲', color: '#40916C', label: 'Level 3 · Cedar'    },
  Keffiyeh: { emoji: '🏅', color: '#D4A017', label: 'Level 4 · Keffiyeh' },
};

export default function TierBadge({ tier, size = 'md' }) {
  const cfg  = TIER_CONFIG[tier] || TIER_CONFIG.Seedling;
  const isLg = size === 'lg';

  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '22', borderColor: cfg.color }, isLg && styles.badgeLg]}>
      <Text style={isLg ? styles.emojiLg : styles.emoji}>{cfg.emoji}</Text>
      <Text style={[styles.label, { color: cfg.color }, isLg && styles.labelLg]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, gap: 4 },
  badgeLg: { paddingHorizontal: 16, paddingVertical: 8 },
  emoji:   { fontSize: 14 },
  emojiLg: { fontSize: 20 },
  label:   { fontSize: 13, fontWeight: '600' },
  labelLg: { fontSize: 17 },
});
