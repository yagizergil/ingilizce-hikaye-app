import { useCallback, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { motion, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { EmptyState, ErrorState, LoadingState, useToast } from "@/components/ui";
import { useCustomDecksQuery } from "@/features/vocabulary/api/useCustomDecksQuery";
import { useCreateDeckMutation } from "@/features/vocabulary/api/useDeckMutations";
import { DeckCard } from "@/features/vocabulary/components/DeckCard";
import { CreateDeckSheet } from "@/features/vocabulary/components/CreateDeckSheet";
import { ExploreStrip } from "@/features/vocabulary/components/ExploreStrip";

import type { CustomDeck } from "@/features/vocabulary/types";

function RowGap() {
  return <View style={{ height: spacing.xs }} />;
}

/**
 * "Destelerim" sekmesi -- kullanıcının kendi kelime destelerinin listesi.
 *
 * TAMAMEN ÜCRETSİZ: deste sayısında sınır yok (2026-09-20 ürün kararı,
 * bkz. docs/plans/2026-09-20-kelimelerim-redesign-design.md). Bu ekranda
 * hiçbir paywall tetikleyicisi yok.
 */
export function DecksTab() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { show: showToast } = useToast();
  const { data: decks, isLoading, isError, refetch } = useCustomDecksQuery();
  const createDeck = useCreateDeckMutation();
  const createSheetRef = useRef<BottomSheetModal>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenCreate = useCallback(() => {
    trackEvent("custom_deck_create_opened");
    createSheetRef.current?.present();
  }, []);

  const handleCreate = useCallback(
    (values: { name: string; colorKey: string }) => {
      setSubmitting(true);
      createDeck.mutate(values, {
        onSuccess: () => {
          createSheetRef.current?.dismiss();
        },
        onError: () => {
          showToast(t("vocabulary.decks.createError"));
        },
        onSettled: () => setSubmitting(false),
      });
    },
    [createDeck, showToast, t],
  );

  const handleOpenDeck = useCallback((deck: CustomDeck) => {
    trackEvent("custom_deck_opened", { deck_id: deck.id });
    router.push(`/deck/${deck.id}`);
  }, []);

  const handleOpenPack = useCallback((level: string) => {
    trackEvent("word_pack_opened", { level });
    router.push({ pathname: "/pack/[level]", params: { level } });
  }, []);

  if (isLoading) {
    return <LoadingState message={t("vocabulary.decks.loading")} />;
  }

  if (isError) {
    return <ErrorState message={t("vocabulary.decks.error")} onRetry={() => void refetch()} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={decks ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DeckCard deck={item} onPress={handleOpenDeck} />}
        ItemSeparatorComponent={RowGap}
        ListHeaderComponent={<ExploreStrip onOpenPack={handleOpenPack} />}
        ListEmptyComponent={
          <EmptyState
            title={t("vocabulary.decks.empty.title")}
            description={t("vocabulary.decks.empty.description")}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        onPress={handleOpenCreate}
        accessibilityRole="button"
        accessibilityLabel={t("vocabulary.decks.createCta")}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent },
          pressed ? { opacity: motion.pressed.opacity } : null,
        ]}
      >
        <Ionicons name="add" size={28} color={theme.text.onAccent} />
      </Pressable>

      <CreateDeckSheet ref={createSheetRef} onSubmit={handleCreate} submitting={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.screenBottom,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});
