import { useState } from "react";
import { StyleSheet, Text, View, type DimensionValue } from "react-native";

import type { ReactNode } from "react";

import { Image } from "expo-image";

import { monoType, motion, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

interface BookCoverProps {
  title: string;
  author: string;
  /** @deprecated No longer used — the fallback is a single neutral surface
   * color for every book now (see the component doc comment below), not a
   * per-book hash-derived tint. Kept optional, unused, so the existing
   * callers in `src/features/home` and `src/features/library` (out of
   * scope for this design-tokens pass — screen-level files) keep
   * typechecking unchanged; remove this prop and its call sites the next
   * time those feature components are touched. */
  slug?: string;
  coverUrl?: string | null;
  width: DimensionValue;
  height: DimensionValue;
  /** FAZ 2 (2026-09-14): referans uygulamada seviye rozeti kapağın
   * ÜZERİNE bindirilmiş (sol-üst köşe), ayrı bir satırda değil. Kapak
   * kendi konumlama bağlamını (`position: relative`) sağlıyor ki çağıran
   * (örn. `ShelfBookCard`) rozeti/aksiyon şeridini üstüne mutlak
   * konumlandırabilsin -- bkz. bu bileşenin altındaki `overlay` prop'u. */
  overlay?: ReactNode;
}

/**
 * Renders the book's real cover image (Supabase Storage `cover_url`) and
 * falls back to a typographic treatment (Fraunces title + mono author) on
 * a single neutral surface color if the image is missing or fails to load.
 *
 * REQUIRED FIX vs. the previous pass: that version colored the fallback
 * per-book (a hashed pick from a fixed palette). Product owner explicitly
 * rejected per-book fallback color — the spec is "a single neutral surface
 * color", no per-book variation. Rewritten to use `theme.bg.surface` (the
 * one raised-surface role in the token set) for every fallback, with
 * `theme.border.hairline` as its only distinguishing edge. The `slug` prop
 * and the deterministic hash/palette it drove have been removed entirely
 * since nothing else about them was needed once per-book color is gone.
 *
 * REVISED (post-launch, product-owner design pass): covers were perfectly
 * flat/sharp-cornered per the original mockups, which read as cheap/dated
 * once real cover art and the fallback state were seen on-device
 * ("kitap kapakları çok kötü"). Given `radius.sm` (6px, spacing.ts) — the
 * same small radius already used elsewhere for subtle softening — a
 * matching corner radius on every cover (image AND fallback) for a
 * cleaner, more polished feel, still with no shadow (shadows remain
 * un-specified anywhere in the system and would look inconsistent with
 * every other flat/hairline surface). This is the one deliberate
 * deviation from the "flat, hairline-only" mockup rule.
 */
export function BookCover({ title, author, coverUrl, width, height, overlay }: BookCoverProps) {
  // `slug` intentionally destructured out of the props type above but not
  // read here — see its @deprecated doc comment.
  const { theme } = useTheme();
  const [failed, setFailed] = useState(false);
  const showFallback = failed || !coverUrl;

  return (
    <View style={[styles.container, { width, height }]}>
      {showFallback ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.fallback,
            {
              backgroundColor: theme.bg.surface,
              borderColor: theme.border.hairline,
              borderRadius: radius.cover,
            },
          ]}
          accessibilityRole="image"
          accessibilityLabel={`${title}, ${author}`}
        >
          <Text
            style={[type.bookTitleMd, styles.title, { color: theme.text.primary }]}
            numberOfLines={4}
          >
            {title}
          </Text>
          <Text
            style={[monoType.author, styles.author, { color: theme.text.secondary }]}
            numberOfLines={1}
          >
            {author}
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: coverUrl }}
          style={[
            StyleSheet.absoluteFill,
            styles.image,
            { backgroundColor: theme.border.hairline, borderRadius: radius.cover },
          ]}
          contentFit="cover"
          accessibilityLabel={title}
          onError={() => setFailed(true)}
          transition={motion.duration.base}
        />
      )}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  image: {
    overflow: "hidden",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    gap: spacing.xs,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    textAlign: "center",
  },
  author: {
    textAlign: "center",
  },
});
