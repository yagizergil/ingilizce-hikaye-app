import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { levelAccent, monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button, Card } from "@/components/ui";

import type { Book } from "@/features/library";

interface HomeHeroProps {
  /** Kullanıcının seviye testinden çıkan okuma seviyesi; yoksa null. */
  level: string | null;
  /** Yarım kalmış kitap; yoksa null. */
  continueBook: Book | null;
  /** Yarım kalmış kitabın ilerlemesi (0-100). */
  continuePercent?: number;
  onContinue: (book: Book) => void;
  onBrowseLevel: () => void;
}

/**
 * Ana sayfanın karşılama bloğu.
 *
 * 2026-09-07 tasarım revizyonu: ekran küçük bir logo ve hemen ardından bir
 * raf yığınıyla açılıyordu — kullanıcıya "sen neredesin, sırada ne var"
 * sorusunun cevabını veren hiçbir şey yoktu. Bu blok ekranın çapası:
 * derin renkli bir yüzey, büyük tipografi ve tek bir net eylem.
 *
 * İki hâli var ve ikisi de gerçek veriyle çalışıyor — boş bir kabuk değil:
 * yarım kalmış kitap varsa onu sürdürmeye, yoksa kullanıcının seviyesindeki
 * kitapları görmeye çağırıyor.
 */
export function HomeHero({
  level,
  continueBook,
  continuePercent,
  onContinue,
  onBrowseLevel,
}: HomeHeroProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const known = level != null && level in levelAccent;
  const dotColor = known ? levelAccent[level as keyof typeof levelAccent] : theme.onDeep;

  return (
    <Card tone="deep" style={styles.card}>
      <View style={styles.eyebrowRow}>
        {level ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
        <Text style={[monoType.eyebrow, { color: theme.onDeep }]}>
          {level ? t("home.hero.levelEyebrow", { level }) : t("home.hero.welcomeEyebrow")}
        </Text>
      </View>

      <Text style={[type.heroTitle, styles.title, { color: theme.onDeep }]}>
        {continueBook ? continueBook.title : t("home.hero.title")}
      </Text>

      <Text style={[monoType.rowText, styles.body, { color: theme.onDeep }]}>
        {continueBook
          ? t("home.hero.continueBody", { percent: Math.round(continuePercent ?? 0) })
          : t("home.hero.startBody")}
      </Text>

      <View style={styles.action}>
        {continueBook ? (
          <Button
            label={t("home.hero.continueAction")}
            onPress={() => onContinue(continueBook)}
            fullWidth
          />
        ) : (
          <Button
            label={t("home.hero.browseAction")}
            onPress={onBrowseLevel}
            fullWidth
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sectionGap,
    padding: spacing.xl,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    marginTop: spacing.sm,
  },
  body: {
    marginTop: spacing.xs,
    opacity: 0.85,
  },
  action: {
    marginTop: spacing.ml,
  },
});
