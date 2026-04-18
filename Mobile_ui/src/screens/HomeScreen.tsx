import { useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radius, space } from '../theme/spacing';
import type { AuthResponse } from '../services/api';

type Props = {
  session: AuthResponse;
  onSignOut: () => void;
  onOpenPantry: () => void;
  onOpenBills: () => void;
  onOpenBuyList: () => void;
};

type TimeChoice = '10' | '20' | '30' | 'free';

type RecipeVideo = { title: string; url: string };

type Dish = {
  id: string;
  name: string;
  minutes: number;
  emoji: string;
  tag: string;
  imageUrl: string;
  videos: RecipeVideo[];
  steps: string[];
};

function youtubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

const TIME_OPTIONS: { id: TimeChoice; label: string; hint: string }[] = [
  { id: '10', label: '10 min', hint: 'Quick bite' },
  { id: '20', label: '20 min', hint: 'Weeknight' },
  { id: '30', label: '30 min', hint: 'Full plate' },
  { id: 'free', label: 'Free time', hint: 'No rush' },
];

const DUMMY_DISHES: Dish[] = [
  {
    id: '1',
    name: 'Garlic butter pasta',
    minutes: 18,
    emoji: '🍝',
    tag: 'Comfort',
    imageUrl: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=900&q=80',
    videos: [
      { title: 'Recipe search on YouTube', url: youtubeSearchUrl('garlic butter pasta recipe') },
      { title: 'Pasta technique basics', url: youtubeSearchUrl('how to cook pasta al dente') },
    ],
    steps: [
      'Boil salted water and cook pasta until al dente; reserve a mug of pasta water.',
      'Warm olive oil in a pan, add minced garlic until fragrant (don’t brown).',
      'Toss in drained pasta, a knob of butter, and a splash of pasta water.',
      'Season with salt, pepper, and parmesan if you have it; serve hot.',
    ],
  },
  {
    id: '2',
    name: 'Caprese salad',
    minutes: 8,
    emoji: '🍅',
    tag: 'Fresh',
    imageUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=900&q=80',
    videos: [
      { title: 'Caprese salad ideas', url: youtubeSearchUrl('caprese salad recipe') },
      { title: 'Tomato & mozzarella tips', url: youtubeSearchUrl('slice mozzarella for caprese') },
    ],
    steps: [
      'Slice tomatoes and mozzarella into even rounds.',
      'Layer tomato, mozzarella, and fresh basil on a plate.',
      'Drizzle olive oil, a pinch of salt, and balsamic if you like.',
      'Let sit 2 minutes so the flavors meld, then serve.',
    ],
  },
  {
    id: '3',
    name: 'Vegetable stir-fry',
    minutes: 22,
    emoji: '🥦',
    tag: 'Light',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=900&q=80',
    videos: [
      { title: 'Stir-fry at home', url: youtubeSearchUrl('vegetable stir fry recipe') },
      { title: 'Wok heat & movement', url: youtubeSearchUrl('stir fry wok technique') },
    ],
    steps: [
      'Prep vegetables into similar-sized pieces; pat dry.',
      'Heat oil in a wok or large pan until very hot.',
      'Stir-fry harder vegetables first, then softer ones; keep things moving.',
      'Add soy sauce, garlic, ginger; toss 1 minute. Serve over rice or noodles.',
    ],
  },
  {
    id: '4',
    name: 'Masoor dal & rice',
    minutes: 35,
    emoji: '🍛',
    tag: 'Hearty',
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=900&q=80',
    videos: [
      { title: 'Dal recipes', url: youtubeSearchUrl('masoor dal recipe') },
      { title: 'Tempering (tadka) how-to', url: youtubeSearchUrl('indian dal tadka') },
    ],
    steps: [
      'Rinse masoor dal; simmer with water until soft (about 20 min).',
      'In a pan, temper cumin, onion, tomato, turmeric, and salt; add to dal.',
      'Simmer 5 more minutes; finish with lemon and cilantro.',
      'Cook rice separately; serve dal over rice.',
    ],
  },
  {
    id: '5',
    name: 'Shakshuka',
    minutes: 28,
    emoji: '🍳',
    tag: 'Brunch',
    imageUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=900&q=80',
    videos: [
      { title: 'Shakshuka recipes', url: youtubeSearchUrl('shakshuka recipe') },
      { title: 'Poaching eggs in sauce', url: youtubeSearchUrl('shakshuka eggs technique') },
    ],
    steps: [
      'Sauté onion and bell pepper until soft; add garlic and spices.',
      'Pour in crushed tomatoes; simmer 10 minutes until thick.',
      'Make wells in the sauce; crack eggs in and cover until whites set.',
      'Top with herbs and feta; serve with bread for dipping.',
    ],
  },
  {
    id: '6',
    name: 'Miso soup & onigiri',
    minutes: 15,
    emoji: '🍙',
    tag: 'Cozy',
    imageUrl: 'https://images.unsplash.com/photo-1617093727343-374518b1b490?w=900&q=80',
    videos: [
      { title: 'Miso soup basics', url: youtubeSearchUrl('miso soup recipe') },
      { title: 'Onigiri shaping', url: youtubeSearchUrl('how to make onigiri') },
    ],
    steps: [
      'Warm dashi or broth; whisk in miso off the heat (don’t boil miso).',
      'Add tofu cubes and wakame; simmer gently 2 minutes.',
      'Shape warm rice into triangles with a pinch of salt; optional nori wrap.',
      'Serve soup with onigiri on the side.',
    ],
  },
  {
    id: '7',
    name: 'Grilled cheese & soup',
    minutes: 20,
    emoji: '🥪',
    tag: 'Classic',
    imageUrl: 'https://images.unsplash.com/photo-1528736235302-52922cf5c3b0?w=900&q=80',
    videos: [
      { title: 'Grilled cheese ideas', url: youtubeSearchUrl('grilled cheese sandwich recipe') },
      { title: 'Tomato soup pairing', url: youtubeSearchUrl('tomato soup with grilled cheese') },
    ],
    steps: [
      'Butter two bread slices on the outside; layer cheese inside.',
      'Toast in a pan on medium-low until golden and cheese melts.',
      'Heat canned or leftover soup while the sandwich cooks.',
      'Cut sandwich, dip, and serve.',
    ],
  },
  {
    id: '8',
    name: 'Chickpea curry bowl',
    minutes: 32,
    emoji: '🥘',
    tag: 'Veggie',
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=900&q=80',
    videos: [
      { title: 'Chickpea curry recipes', url: youtubeSearchUrl('chickpea curry recipe') },
      { title: 'Coconut curry tips', url: youtubeSearchUrl('coconut milk curry technique') },
    ],
    steps: [
      'Sauté onion until golden; add ginger-garlic and spices.',
      'Stir in tomatoes and cook until jammy; add drained chickpeas.',
      'Pour in coconut milk or water; simmer 15 minutes.',
      'Finish with spinach and lime; serve with rice or flatbread.',
    ],
  },
];

function dishesForTime(choice: TimeChoice) {
  if (choice === 'free') return DUMMY_DISHES;
  const cap = choice === '10' ? 12 : choice === '20' ? 24 : 34;
  return DUMMY_DISHES.filter((d) => d.minutes <= cap);
}

export default function HomeScreen({ session, onSignOut, onOpenPantry, onOpenBills, onOpenBuyList }: Props) {
  const { width: winW, height: winH } = useWindowDimensions();
  const [timeChoice, setTimeChoice] = useState<TimeChoice>('20');
  const [recipeDish, setRecipeDish] = useState<Dish | null>(null);

  const recipePopupLayout = useMemo(
    () => ({
      width: Math.min(winW - space.lg * 2, 400),
      maxHeight: winH * 0.88,
    }),
    [winW, winH],
  );

  const visibleDishes = useMemo(() => dishesForTime(timeChoice), [timeChoice]);
  const firstName = (session.user.name || session.user.email).split(/\s+/)[0] || 'chef';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.homeBg}>
        <LinearGradient
          colors={[colors.homeGradientTop, colors.homeGradientBottom]}
          locations={[0, 0.45]}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.headerPill}>
              <Text style={styles.headerPillText}>Kitchen</Text>
            </View>
            <Text style={styles.title}>Hello, {firstName}</Text>
            <Text style={styles.subLead}>Pick how long you have—we’ll suggest dishes to match.</Text>
          </View>
          <Pressable
            onPress={onOpenPantry}
            style={({ pressed }) => [styles.pantryBtn, pressed && styles.pantryBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Open pantry and kitchen products"
          >
            <Ionicons name="basket-outline" size={26} color={colors.sage} />
          </Pressable>
        </View>

        <View style={styles.sectionAfterHero}>
          <Text style={styles.sectionLabel}>How much time?</Text>
          <View style={styles.timeRow}>
            {TIME_OPTIONS.map((opt) => {
              const selected = timeChoice === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setTimeChoice(opt.id)}
                  style={({ pressed }) => [
                    styles.timeChip,
                    selected && styles.timeChipSelected,
                    pressed && !selected && styles.timeChipPressed,
                  ]}
                >
                  <Text style={[styles.timeChipLabel, selected && styles.timeChipLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.timeChipHint, selected && styles.timeChipHintSelected]}>{opt.hint}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>Cook something</Text>
          <Text style={styles.sectionMeta}>
            {timeChoice === 'free' ? 'All ideas' : `~${timeChoice} min window`} · {visibleDishes.length} picks
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dishStrip}
        >
          {visibleDishes.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => setRecipeDish(d)}
              style={({ pressed }) => [styles.dishCard, pressed && styles.dishCardPressed]}
            >
              <Text style={styles.dishEmoji}>{d.emoji}</Text>
              <Text style={styles.dishName} numberOfLines={2}>
                {d.name}
              </Text>
              <View style={styles.dishFooter}>
                <Text style={styles.dishMinutes}>{d.minutes} min</Text>
                <View style={styles.dishTag}>
                  <Text style={styles.dishTagText}>{d.tag}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {visibleDishes.length === 0 && (
          <View style={styles.emptyDishes}>
            <Text style={styles.emptyDishesText}>Nothing fits that window—try Free time or a longer slot.</Text>
          </View>
        )}

        <Pressable onPress={onOpenBills} style={styles.viewBillsBtn}>
          <Text style={styles.viewBillsBtnText}>View Bills</Text>
        </Pressable>
        <Pressable onPress={onOpenBuyList} style={styles.itemsToBuyBtn}>
          <Text style={styles.itemsToBuyBtnText}>Items to Buy</Text>
        </Pressable>

        <Text style={styles.signOutHint}>You can sign out anytime from here.</Text>
        <Pressable onPress={onSignOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <View style={styles.footer} />
        </ScrollView>
      </View>

      <Modal
        visible={recipeDish !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setRecipeDish(null)}
      >
        <Pressable style={styles.recipePopupOverlay} onPress={() => setRecipeDish(null)}>
          <Pressable
            style={[
              styles.recipePopupCard,
              { width: recipePopupLayout.width, maxHeight: recipePopupLayout.maxHeight },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {recipeDish && (
              <ScrollView
                style={{ maxHeight: recipePopupLayout.maxHeight }}
                showsVerticalScrollIndicator={false}
                bounces
              >
                <View style={styles.recipeHero}>
                  <Image
                    source={{ uri: recipeDish.imageUrl }}
                    style={styles.recipeHeroImage}
                    resizeMode="cover"
                    accessibilityLabel={`Photo of ${recipeDish.name}`}
                  />
                  <Pressable
                    onPress={() => setRecipeDish(null)}
                    style={({ pressed }) => [styles.recipeHeroClose, pressed && styles.recipeHeroClosePressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Close recipe"
                    hitSlop={12}
                  >
                    <Ionicons name="close-circle" size={38} color="rgba(255,252,249,0.96)" />
                  </Pressable>
                </View>

                <View style={styles.recipePopupBody}>
                  <Text style={styles.recipePopupEmoji}>{recipeDish.emoji}</Text>
                  <Text style={styles.recipePopupTitle}>{recipeDish.name}</Text>
                  <Text style={styles.recipeMeta}>
                    {recipeDish.minutes} min · {recipeDish.tag}
                  </Text>

                  <Text style={styles.videosHeading}>Videos</Text>
                  <Text style={styles.videosHint}>Opens in YouTube (browser or app).</Text>
                  {recipeDish.videos.map((v, i) => (
                    <Pressable
                      key={`${v.url}-${i}`}
                      onPress={() => void Linking.openURL(v.url)}
                      style={({ pressed }) => [styles.videoLink, pressed && styles.videoLinkPressed]}
                    >
                      <Ionicons name="logo-youtube" size={26} color="#E53935" />
                      <View style={styles.videoLinkText}>
                        <Text style={styles.videoLinkTitle}>{v.title}</Text>
                        <Text style={styles.videoLinkSub}>Tap to watch</Text>
                      </View>
                      <Ionicons name="open-outline" size={20} color={colors.textMuted} />
                    </Pressable>
                  ))}

                  <Text style={styles.stepsHeading}>Steps</Text>
                  {recipeDish.steps.map((step, index) => (
                    <View key={index} style={styles.stepRow}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}

                  <Pressable onPress={() => setRecipeDish(null)} style={styles.recipePopupCloseBtn}>
                    <Text style={styles.modalCloseText}>Close</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  homeBg: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xxl,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
  },
  topBarLeft: {
    flex: 1,
    minWidth: 0,
  },
  headerPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.sageMuted,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.full,
    marginBottom: space.xl,
  },
  headerPillText: {
    color: colors.sage,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  subLead: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: space.xs,
    fontWeight: '500',
    maxWidth: 300,
  },
  pantryBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.sageMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  pantryBtnPressed: {
    backgroundColor: colors.surfaceInput,
    borderColor: colors.borderStrong,
  },
  sectionAfterHero: {
    marginTop: space.lg,
  },
  sectionLabel: {
    color: colors.sage,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: space.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  timeChip: {
    minWidth: '22%',
    flexGrow: 1,
    maxWidth: '48%',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipPressed: {
    backgroundColor: colors.surfaceInput,
  },
  timeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  timeChipLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  timeChipLabelSelected: {
    color: colors.primaryPressed,
  },
  timeChipHint: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  timeChipHintSelected: {
    color: colors.textSecondary,
  },
  dishStrip: {
    paddingBottom: space.sm,
    gap: space.sm,
    paddingRight: space.lg,
  },
  dishCard: {
    width: 156,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginRight: space.sm,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
  },
  dishCardPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.canvas,
  },
  dishEmoji: {
    fontSize: 36,
    marginBottom: space.sm,
  },
  dishName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    minHeight: 42,
  },
  dishFooter: {
    marginTop: space.md,
    gap: space.xs,
  },
  dishMinutes: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  dishTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.sageMuted,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  dishTagText: {
    color: colors.sage,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyDishes: {
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyDishesText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  viewBillsBtn: {
    marginTop: space.lg,
    borderWidth: 2,
    borderColor: colors.sage,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
    backgroundColor: colors.sageMuted,
  },
  viewBillsBtnText: {
    color: colors.sage,
    fontWeight: '800',
    fontSize: 16,
  },
  itemsToBuyBtn: {
    marginTop: space.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
  },
  itemsToBuyBtnText: {
    color: colors.primaryPressed,
    fontWeight: '800',
    fontSize: 16,
  },
  signOut: {
    marginTop: space.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
    backgroundColor: colors.canvas,
  },
  signOutText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 16,
  },
  signOutHint: {
    marginTop: space.lg,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: { height: 24 },
  modalCloseText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  recipePopupOverlay: {
    flex: 1,
    backgroundColor: colors.overlayScrim,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  recipePopupCard: {
    backgroundColor: colors.canvas,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 14,
  },
  recipeHero: {
    position: 'relative',
    width: '100%',
    height: 200,
    backgroundColor: colors.surfaceInput,
  },
  recipeHeroImage: {
    width: '100%',
    height: '100%',
  },
  recipeHeroClose: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    backgroundColor: colors.overlayTint,
    borderRadius: radius.full,
  },
  recipeHeroClosePressed: {
    opacity: 0.85,
  },
  recipePopupBody: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  recipePopupEmoji: {
    fontSize: 28,
    marginBottom: space.xs,
  },
  recipePopupTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  recipeMeta: {
    marginTop: space.xs,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: space.md,
  },
  videosHeading: {
    color: colors.sage,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  videosHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: space.sm,
    fontWeight: '500',
  },
  videoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
  },
  videoLinkPressed: {
    backgroundColor: colors.surfaceInput,
    borderColor: colors.borderStrong,
  },
  videoLinkText: {
    flex: 1,
    minWidth: 0,
  },
  videoLinkTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  videoLinkSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  stepsHeading: {
    color: colors.sage,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: space.md,
    marginBottom: space.sm,
  },
  recipePopupCloseBtn: {
    marginTop: space.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    marginBottom: space.md,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.sageMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: colors.sage,
    fontSize: 14,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    paddingTop: 2,
  },
});
