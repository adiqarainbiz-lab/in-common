import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  useWindowDimensions, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const SLIDES = [
  {
    id: '1',
    emoji: '🌿',
    title: 'Welcome to In Common',
    subtitle: 'A loyalty programme built for the local businesses of Jerusalem.',
    bg: ['#1B4332', '#2D6A4F'],
  },
  {
    id: '2',
    emoji: '📱',
    title: 'Show your QR code',
    subtitle: 'At the checkout of any partner business, open your QR code and let staff scan it. That\'s it — points added.',
    bg: ['#2D6A4F', '#40916C'],
    tip: 'Your code refreshes every 60 seconds for security.',
  },
  {
    id: '3',
    emoji: '⭐',
    title: 'Climb the tiers',
    subtitle: 'Every point gets you closer to the next level.',
    bg: ['#1B4332', '#2D6A4F'],
    tiers: [
      { emoji: '🌱', name: 'Seedling', pts: '0 pts' },
      { emoji: '🫒', name: 'Olive',    pts: '500 pts' },
      { emoji: '🌲', name: 'Cedar',    pts: '2,000 pts' },
      { emoji: '🏅', name: 'Keffiyeh', pts: '5,000 pts' },
    ],
  },
  {
    id: '4',
    emoji: '💚',
    title: 'Redeem as store credit',
    subtitle: 'Tell the cashier you\'d like to use your points. 10 points = 1 JD off your bill. No bank account needed.',
    bg: ['#40916C', '#52B788'],
    tip: 'Points are valid for 18 months.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const { markOnboardingSeen } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      markOnboardingSeen();
    }
  };

  const skip = () => markOnboardingSeen();

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) setActiveIndex(viewableItems[0].index);
  }).current;

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <LinearGradient colors={item.bg} style={styles.slideGradient}>
        {/* Skip button */}
        <TouchableOpacity style={styles.skipBtn} onPress={skip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Main content */}
        <View style={styles.content}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>

          {/* Tier ladder — slide 3 only */}
          {item.tiers && (
            <View style={styles.tierCard}>
              {item.tiers.map((t, i) => (
                <View key={t.name} style={[styles.tierRow, i < item.tiers.length - 1 && styles.tierRowBorder]}>
                  <Text style={styles.tierEmoji}>{t.emoji}</Text>
                  <Text style={styles.tierName}>{t.name}</Text>
                  <Text style={styles.tierPts}>{t.pts}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tip pill */}
          {item.tip && (
            <View style={styles.tipPill}>
              <Text style={styles.tipText}>💡 {item.tip}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={s => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        scrollEventThrottle={16}
      />

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity style={[styles.btn, isLast && styles.btnLast]} onPress={goNext}>
          <Text style={[styles.btnText, isLast && styles.btnTextLast]}>
            {isLast ? '🌿  Get Started' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#1B4332' },
  slide:         { flex: 1 },
  slideGradient: { flex: 1 },

  skipBtn:       { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36, right: 24, zIndex: 10 },
  skipText:      { color: '#FFFFFF99', fontSize: 15, fontWeight: '600' },

  content:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingTop: 80, paddingBottom: 120 },
  emoji:         { fontSize: 72, marginBottom: 24 },
  title:         { fontSize: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 16, lineHeight: 34 },
  subtitle:      { fontSize: 16, color: '#FFFFFFCC', textAlign: 'center', lineHeight: 24 },

  // Tiers
  tierCard:      { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 8, marginTop: 28, width: '100%' },
  tierRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
  tierRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  tierEmoji:     { fontSize: 22, width: 36 },
  tierName:      { flex: 1, fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  tierPts:       { fontSize: 13, color: '#FFFFFFAA', fontWeight: '600' },

  // Tip
  tipPill:       { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginTop: 24 },
  tipText:       { fontSize: 13, color: '#FFFFFFCC', textAlign: 'center' },

  // Bottom
  bottomBar:     {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 24, paddingTop: 16,
    backgroundColor: 'rgba(27,67,50,0.95)',
    alignItems: 'center', gap: 16,
  },
  dots:          { flexDirection: 'row', gap: 8 },
  dot:           { height: 8, borderRadius: 4 },
  dotActive:     { width: 24, backgroundColor: '#FFFFFF' },
  dotInactive:   { width: 8, backgroundColor: '#FFFFFF44' },

  btn:           { backgroundColor: '#FFFFFF22', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 48, borderWidth: 1, borderColor: '#FFFFFF55' },
  btnLast:       { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  btnText:       { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  btnTextLast:   { color: '#1B4332' },
});
