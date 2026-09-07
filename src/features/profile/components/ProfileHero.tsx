import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { CefrLevel } from "@/features/onboarding/levelEstimate";

interface ProfileHeroProps {
  displayName: string | null;
  email: string | null;
  isAnonymous: boolean;
  targetLevel: CefrLevel | null;
  memberSince: string | null;
}

/**
 * Profil ekranının kimlik başlığı — koyu bir blok üstünde baş harf
 * rozeti, ad, seviye ve üyelik tarihi.
 *
 * NEDEN VAR (2026-09-07): ekran daha önce doğrudan istatistik kutularıyla
 * başlıyordu; "profil" olduğunu söyleyen tek şey başlıktaki kelimeydi.
 * Rakiplerin (Duolingo, LingQ, Beelinguapp) profil ekranlarının tamamı
 * kimlikle açılıyor, çünkü bu ekranın işi kullanıcıya "senin ilerlemen"
 * demek. `theme.deep` bloğu ekrana bir çıpa veriyor — tasarım yönündeki
 * ikinci yapısal ton (bkz. docs/plans/2026-09-07-tasarim-yonu.md).
 */
/** İlk boş olmayan değer; son değer her zaman dolu bir yedek olmalı. */
function firstNonBlank(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export function ProfileHero({
  displayName,
  email,
  isAnonymous,
  targetLevel,
  memberSince,
}: ProfileHeroProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  // Ad yoksa e-postanın kullanıcı adı kısmı; o da yoksa "Misafir".
  //
  // `??` YETMİYOR: Supabase anonim kullanıcı için `email` alanını null
  // değil BOŞ DİZE ("") döndürüyor. `??` boş dizeyi geçerli bir değer
  // sayar; sonuç olarak ad da baş harf de boş kalıyor ve koyu blokta
  // isimsiz bir avatar görünüyordu.
  const name = firstNonBlank(displayName, email?.split("@")[0], t("profile.hero.guest"));
  const initial = name.slice(0, 1).toLocaleUpperCase(i18n.language);

  const memberSinceLabel = memberSince
    ? t("profile.hero.memberSince", {
        date: new Date(memberSince).toLocaleDateString(i18n.language, {
          year: "numeric",
          month: "long",
        }),
      })
    : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.deep }]}>
      <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
        <Text style={[type.heroTitle, styles.initial, { color: theme.text.onAccent }]}>{initial}</Text>
      </View>

      <View style={styles.identity}>
        <Text style={[type.bookTitleLg, { color: theme.onDeep }]} numberOfLines={1}>
          {name}
        </Text>

        <View style={styles.meta}>
          {targetLevel ? (
            <View style={[styles.levelChip, { borderColor: theme.onDeep }]}>
              <Text style={[monoType.label, { color: theme.onDeep }]}>{targetLevel}</Text>
            </View>
          ) : null}
          <Text style={[monoType.metaTight, styles.metaText, { color: theme.onDeep }]} numberOfLines={1}>
            {isAnonymous ? t("profile.hero.anonymous") : memberSinceLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const AVATAR_SIZE = 60;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    // Baş harf rozetin tam ortasında dursun; yazı tipinin kendi üst/alt
    // boşluğu (Android) merkezi kaydırıyor.
    textAlign: "center",
    includeFontPadding: false,
  },
  identity: {
    flex: 1,
    gap: spacing.xxs,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    flexShrink: 1,
    // Koyu zemin üstünde ikincil bilgi: aynı renk, düşük opaklık.
    opacity: 0.75,
  },
  levelChip: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
