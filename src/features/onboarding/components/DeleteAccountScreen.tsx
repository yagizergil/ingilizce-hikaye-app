import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { spacing, radius, type, monoType } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";

interface DeleteAccountScreenProps {
  onDeleted: () => void;
  onCancel: () => void;
}

export function DeleteAccountScreen({ onDeleted, onCancel }: DeleteAccountScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("no session");

      const response = await fetch(`${env.supabaseUrl}/functions/v1/delete-account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("delete failed");

      await supabase.auth.signOut();
      onDeleted();
    } catch {
      Alert.alert(t("common.errorTitle"), t("account.delete.error"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      <View style={styles.content}>
        <Text style={[type.screenTitle, styles.title, { color: theme.text.primary }]}>
          {t("account.delete.title")}
        </Text>
        <Text style={[monoType.rowText, styles.body, { color: theme.text.secondary }]}>
          {t("account.delete.body")}
        </Text>

        <Text style={[monoType.rowText, styles.listTitle, { color: theme.text.primary }]}>
          {t("account.delete.listTitle")}
        </Text>
        <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>{t("account.delete.item1")}</Text>
        <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>{t("account.delete.item2")}</Text>
        <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>{t("account.delete.item3")}</Text>
        <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>{t("account.delete.item4")}</Text>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setConfirmed((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed }}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: confirmed ? theme.danger : theme.border.strong,
                backgroundColor: confirmed ? theme.danger : "transparent",
              },
            ]}
          />
          <Text style={[monoType.metaTight, styles.checkboxLabel, { color: theme.text.primary }]}>
            {t("account.delete.confirmLabel")}
          </Text>
        </Pressable>

        <View style={styles.deleteButtonWrap}>
          <Button
            label={t("account.delete.confirmButton")}
            onPress={() => void handleDelete()}
            disabled={!confirmed || isDeleting}
            loading={isDeleting}
            variant="destructive"
            fullWidth
          />
        </View>

        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>{t("common.back")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    marginBottom: spacing.sm,
  },
  body: {
    marginBottom: spacing.md,
  },
  listTitle: {
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  checkboxLabel: {
    flex: 1,
  },
  deleteButtonWrap: {
    marginTop: spacing.lg,
  },
  cancelButton: {
    marginTop: spacing.sm,
    alignItems: "center",
  },
});
