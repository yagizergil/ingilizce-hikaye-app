import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailMetrics,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  quizType,
} from "@/theme";
import { useHomePalette } from "@/features/home/useHomePalette";
import { useToast } from "@/components/ui";
import { useUpdateDisplayNameMutation } from "@/features/profile/api/useUpdateDisplayNameMutation";

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
  const palette = useHomePalette();
  const { show: showToast } = useToast();
  const updateName = useUpdateDisplayNameMutation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEditing = () => {
    setDraft(displayName ?? "");
    setEditing(true);
  };

  const saveName = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === displayName) {
      setEditing(false);
      return;
    }
    updateName.mutate(trimmed, {
      onSuccess: () => setEditing(false),
      onError: () => showToast(t("profile.hero.nameSaveError")),
    });
  };

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
    <View style={[styles.container, { backgroundColor: palette.card }]}>
      <View style={styles.avatar}>
        <Text style={[quizType.question, styles.initial]}>{initial}</Text>
      </View>

      <View style={styles.identity}>
        {editing ? (
          <View style={styles.nameRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t("profile.hero.namePlaceholder")}
              placeholderTextColor={homeColors.muted}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveName}
              style={[quizType.question, styles.nameInput, { color: palette.ink }]}
            />
            <Pressable
              onPress={saveName}
              disabled={updateName.isPending}
              accessibilityRole="button"
              accessibilityLabel={t("profile.hero.saveName")}
              hitSlop={homeSpace.sm}
            >
              <Ionicons name="checkmark" size={22} color={detailColors.green} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.nameRow}>
            <Text
              style={[quizType.question, styles.nameText, { color: palette.ink }]}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Pressable
              onPress={startEditing}
              accessibilityRole="button"
              accessibilityLabel={t("profile.hero.editName")}
              hitSlop={homeSpace.sm}
            >
              <Ionicons name="pencil" size={16} color={homeColors.muted} />
            </Pressable>
          </View>
        )}

        <View style={styles.meta}>
          {targetLevel ? (
            <View style={styles.levelChip}>
              <Text style={[homeType.statLabel, styles.levelText]}>{targetLevel}</Text>
            </View>
          ) : null}
          <Text
            style={[homeType.statLabel, styles.metaText, { color: palette.muted }]}
            numberOfLines={1}
          >
            {/* İsmini giren kullanıcıya "misafir olarak okuyorsun" demek
                yanlış olurdu; o zaman üyelik tarihi gösteriliyor. */}
            {isAnonymous && !displayName ? t("profile.hero.anonymous") : memberSinceLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const MAX_NAME_LENGTH = 40;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.lg,
    marginHorizontal: homeMetrics.gutter,
    marginTop: -detailMetrics.profileOverlap,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 5,
  },
  avatar: {
    width: detailMetrics.profileAvatar,
    height: detailMetrics.profileAvatar,
    borderRadius: detailMetrics.profileAvatar / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: detailColors.amberInk,
    textAlign: "center",
    includeFontPadding: false,
  },
  identity: {
    flex: 1,
    gap: homeSpace.xs,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.sm,
  },
  nameText: {
    flexShrink: 1,
  },
  nameInput: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: homeColors.muted,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.sm,
  },
  metaText: {
    flexShrink: 1,
  },
  levelChip: {
    paddingHorizontal: homeSpace.md,
    height: detailMetrics.profileChip,
    borderRadius: detailMetrics.profileChip / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: {
    color: detailColors.amberInk,
    fontWeight: "700",
  },
});
