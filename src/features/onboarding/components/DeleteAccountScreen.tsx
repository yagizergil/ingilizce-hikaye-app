import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button, SkyHeader } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";
import { trackError } from "@/lib/analytics";
import { reloadApp } from "@/lib/rtl";

interface DeleteAccountScreenProps {
  onDeleted: () => void;
  onCancel: () => void;
}

export function DeleteAccountScreen({ onDeleted, onCancel }: DeleteAccountScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const palette = useHomePalette();
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    let deleted = false;
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("no session");

      const response = await fetch(`${env.supabaseUrl}/functions/v1/delete-account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("delete failed");
      deleted = true;

      // DENETİM BULGUSU (2026-10-06): eskiden yalnızca sunucuya `signOut()`
      // gidip köke dönülüyordu. Oturum kalmıyor, önbellekte silinen hesabın
      // verisi (onboarding "bitti", premium, kitaplar) görünmeye devam
      // ediyor ve her sorgu boş dönüyordu. Doğru sıra Profil'deki
      // "baştan başla" ile aynı: yerel çıkış (hesap artık yok, sunucu
      // çıkışı 403 verirdi) -> yeni anonim oturum -> önbelleği temizle ->
      // uygulamayı yeniden yükle.
      await supabase.auth.signOut({ scope: "local" });
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      queryClient.clear();
      const reloaded = await reloadApp();
      if (!reloaded) onDeleted();
    } catch (error) {
      trackError("account.delete", error, { deleted });
      if (deleted) {
        // Hesap silindi; yalnızca sonraki adım düştü. "Silinemedi" demek
        // yanlış olurdu -- köke dön, açılış yeni oturumu kendisi kurar.
        queryClient.clear();
        onDeleted();
      } else {
        Alert.alert(t("common.errorTitle"), t("account.delete.error"));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const items = ["item1", "item2", "item3", "item4"] as const;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      <SkyHeader title={t("account.delete.title")} onBack={onCancel} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: palette.card }]}>
          <Text style={[homeType.cardSub, { color: palette.muted }]}>
            {t("account.delete.body")}
          </Text>
          <Text style={[detailType.sectionTitle, { color: palette.ink }]}>
            {t("account.delete.listTitle")}
          </Text>
          {items.map((item) => (
            <View key={item} style={styles.itemRow}>
              <Ionicons name="ellipse" size={8} color={theme.danger} />
              <Text style={[detailType.statLabel, styles.itemText, { color: palette.ink }]}>
                {t(`account.delete.${item}`)}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.card, styles.checkboxRow, { backgroundColor: palette.card }]}
          onPress={() => setConfirmed((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed }}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: confirmed ? theme.danger : homeColors.muted,
                backgroundColor: confirmed ? theme.danger : "transparent",
              },
            ]}
          >
            {/* Yalnızca boyalı kare "işaretli" gibi okunmuyordu (kullanıcı
                bulgusu, 2026-09-25) -- tik işareti görünür onay. */}
            {confirmed ? <Ionicons name="checkmark" size={16} color={detailColors.circle} /> : null}
          </View>
          <Text style={[detailType.statLabel, styles.checkboxLabel, { color: palette.ink }]}>
            {t("account.delete.confirmLabel")}
          </Text>
        </Pressable>

        <Button
          label={t("account.delete.confirmButton")}
          onPress={() => void handleDelete()}
          disabled={!confirmed || isDeleting}
          loading={isDeleting}
          variant="destructive"
          fullWidth
        />
        <Button label={t("common.back")} onPress={onCancel} variant="secondary" fullWidth />
      </ScrollView>
    </View>
  );
}

const CHECKBOX = 26;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: homeMetrics.gutter,
    paddingBottom: homeSpace.xl * 2,
    gap: homeSpace.lg,
  },
  card: {
    gap: homeSpace.md,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
  },
  itemText: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: CHECKBOX,
    height: CHECKBOX,
    borderRadius: CHECKBOX / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    flex: 1,
  },
});
