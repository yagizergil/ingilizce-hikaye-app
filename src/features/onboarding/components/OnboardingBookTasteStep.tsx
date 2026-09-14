import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { LoadingState } from "@/components/ui";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

import type { OnboardingBook } from "@/features/onboarding/api/useOnboardingContentQuery";

/**
 * Kitap zevki adımı (referans: `docs/reference/bookvo-05-kitap-secimi.jpeg`).
 *
 * MEKANİK: tek tek kapak gösterilir, kullanıcı beğenir (✓) ya da geçer (✕).
 * Beğenilenler üstteki şeride ekleniyor ve sayaç ilerliyor. Referansta da
 * "Beğendiklerinden kütüphaneni oluşturacağız" deniyor.
 *
 * KAPAKLAR GERÇEK: katalogdan, kullanıcının seçtiği hedef dilde ve
 * seviyesine yakın kitaplar (bkz. `useOnboardingContentQuery`). Örnek
 * kapak göstermek, sonra kütüphanede bambaşka bir şey bulmak akışın
 * verdiği sözü bozardı.
 *
 * BEĞENİLER FAVORİYE YAZILIYOR: adım sonunda `user_favorites`'a
 * ekleniyor (çağıran tarafta), yani bu ekran boşa dönen bir anket değil --
 * kullanıcı uygulamaya girdiğinde rafını dolu buluyor.
 */

/** Referansta "Rafında 5 kitap" hedefi var; aynı eşik. */
const TARGET_LIKES = 5;

interface OnboardingBookTasteStepProps {
  progress: number;
  books: OnboardingBook[];
  loading: boolean;
  likedIds: string[];
  onLike: (bookId: string) => void;
  onSkipBook: () => void;
  onContinue: () => void;
}

export function OnboardingBookTasteStep({
  progress,
  books,
  loading,
  likedIds,
  onLike,
  onSkipBook,
  onContinue,
}: OnboardingBookTasteStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [index, setIndex] = useState(0);
  const current = books[index];

  const likedBooks = useMemo(
    () => books.filter((book) => likedIds.includes(book.id)),
    [books, likedIds],
  );

  const advance = () => setIndex((value) => value + 1);

  const handleLike = () => {
    if (!current) return;
    onLike(current.id);
    advance();
  };

  const handleSkip = () => {
    onSkipBook();
    advance();
  };

  // Kapaklar bittiğinde ya da hedefe ulaşıldığında devam edilebiliyor.
  // Kullanıcıyı 12 kapağın tamamını görmeye ZORLAMIYORUZ.
  const exhausted = index >= books.length;
  const canContinue = likedIds.length > 0 || exhausted;

  return (
    <OnboardingScaffold
      progress={progress}
      title={t("onboarding.taste.title")}
      subtitle={t("onboarding.taste.subtitle")}
      footer={
        <OnboardingFooterButton
          label={t("common.continue")}
          onPress={onContinue}
          disabled={!canContinue}
        />
      }
    >
      {loading ? (
        <LoadingState />
      ) : (
        <View style={styles.body}>
          {/* Beğenilenlerin şeridi -- referansta da üstte küçük kapaklar
              ve altında "Rafında N kitap" sayacı var. */}
          <View style={styles.shelf}>
            {likedBooks.slice(-TARGET_LIKES).map((book) => (
              <View key={book.id} style={[styles.shelfCover, { backgroundColor: theme.bg.surface }]}>
                {book.coverUrl ? (
                  <Image source={{ uri: book.coverUrl }} style={styles.shelfImage} />
                ) : null}
              </View>
            ))}
          </View>

          <View style={styles.counterRow}>
            {likedIds.length > 0 ? (
              <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
            ) : null}
            <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
              {t("onboarding.taste.counter", { count: likedIds.length })}
            </Text>
          </View>

          {current ? (
            <View style={[styles.cover, { backgroundColor: theme.bg.surface }]}>
              {current.coverUrl ? (
                <Image source={{ uri: current.coverUrl }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverFallback}>
                  <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
                    {current.title}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.doneBlock}>
              <Text style={[monoType.rowText, styles.doneText, { color: theme.text.secondary }]}>
                {t("onboarding.taste.done")}
              </Text>
            </View>
          )}

          {current ? (
            <View style={styles.actions}>
              <Pressable
                onPress={handleSkip}
                accessibilityRole="button"
                accessibilityLabel={t("onboarding.taste.skipBook")}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: theme.bg.surface, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="close" size={26} color={theme.text.secondary} />
              </Pressable>
              <Pressable
                onPress={handleLike}
                accessibilityRole="button"
                accessibilityLabel={t("onboarding.taste.likeBook")}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.likeButton,
                  { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="heart" size={26} color={theme.text.onAccent} />
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  shelf: {
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 52,
    alignItems: "center",
  },
  shelfCover: {
    width: 36,
    height: 52,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  shelfImage: {
    width: "100%",
    height: "100%",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  // Referansta büyük kapak kartı ekranın ortasında; oran ~2:3.
  cover: {
    flex: 1,
    aspectRatio: 2 / 3,
    borderRadius: radius.cover,
    overflow: "hidden",
    maxHeight: 420,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  doneBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: {
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xl,
    paddingVertical: spacing.sm,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  likeButton: {
    // Beğen düğmesi referansta daha baskın; vurgu rengi onu zaten öne
    // çıkarıyor, ek bir boyut farkı gerekmiyor.
  },
});
