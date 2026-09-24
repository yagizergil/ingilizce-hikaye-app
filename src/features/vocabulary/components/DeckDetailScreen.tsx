import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { deckColorHex, monoType, motion, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  useToast,
  ScreenHeader,
} from "@/components/ui";
import { UpperText } from "@/components/ui/UpperText";

import { useCustomDecksQuery } from "@/features/vocabulary/api/useCustomDecksQuery";
import { useDeckCardsQuery } from "@/features/vocabulary/api/useDeckCardsQuery";
import {
  useDeleteDeckMutation,
  useRenameDeckMutation,
} from "@/features/vocabulary/api/useDeckMutations";
import {
  useAddDeckCardMutation,
  useDeleteDeckCardMutation,
  useUpdateDeckCardMutation,
} from "@/features/vocabulary/api/useDeckCardMutations";
import { DeckCardRow } from "@/features/vocabulary/components/DeckCardRow";
import { AddEditCardSheet } from "@/features/vocabulary/components/AddEditCardSheet";
import { CreateDeckSheet } from "@/features/vocabulary/components/CreateDeckSheet";

import type { AddEditCardSubmit } from "@/features/vocabulary/components/AddEditCardSheet";
import type { CustomDeckCard } from "@/features/vocabulary/types";

interface DeckDetailScreenProps {
  deckId: string;
  onBack: () => void;
  onStartReview: (deckId: string) => void;
}

function RowGap() {
  return <View style={{ height: spacing.xxs }} />;
}

/**
 * Bir destenin içi: kelime listesi, kelime ekleme/düzenleme/silme, desteyi
 * yeniden adlandırma/silme ve "bu desteyi çalış" girişi.
 *
 * Deste kendisi `useCustomDecksQuery`'nin önbelleğinden bulunuyor (ayrı bir
 * "tek deste" sorgusu yazmaya gerek yok -- liste zaten `name`/`colorKey`/
 * sayaçları taşıyor); yalnızca KARTLAR için ayrı bir sorgu var.
 */
export function DeckDetailScreen({ deckId, onBack, onStartReview }: DeckDetailScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { show: showToast } = useToast();

  const {
    data: decks,
    isLoading: isDeckLoading,
    isError: isDeckError,
    refetch: refetchDecks,
  } = useCustomDecksQuery();
  const deck = decks?.find((item) => item.id === deckId);

  const { data: cards, isLoading, isError, refetch } = useDeckCardsQuery(deckId);

  const addCard = useAddDeckCardMutation();
  const updateCard = useUpdateDeckCardMutation();
  const deleteCard = useDeleteDeckCardMutation();
  const renameDeck = useRenameDeckMutation();
  const deleteDeck = useDeleteDeckMutation();

  const [editingCard, setEditingCard] = useState<CustomDeckCard | null>(null);
  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [deckSubmitting, setDeckSubmitting] = useState(false);

  const cardSheetRef = useRef<BottomSheetModal>(null);
  const renameSheetRef = useRef<BottomSheetModal>(null);

  const handleOpenAddCard = useCallback(() => {
    setEditingCard(null);
    cardSheetRef.current?.present();
  }, []);

  const handleOpenEditCard = useCallback((card: CustomDeckCard) => {
    setEditingCard(card);
    cardSheetRef.current?.present();
  }, []);

  /**
   * DENETİM BULGUSU (2026-09-20, kod incelemesi): sheet'i kapatma
   * çağrısı önceden `onSettled`e bağlıydı -- yani kayıt AĞ HATASIYLA
   * başarısız olsa bile sheet kapanıyor ve kullanıcının az önce yazdığı
   * kelime/karşılık sessizce kayboluyordu (bir hata toast'ı görünüyordu
   * ama yeniden yazmak gerekiyordu). Kapatma artık yalnızca BAŞARIDA;
   * hata durumunda sheet açık kalıyor, kullanıcı verisini kaybetmeden
   * tekrar deneyebiliyor.
   */
  const handleSubmitCard = useCallback(
    (values: AddEditCardSubmit) => {
      setCardSubmitting(true);
      const onSuccess = () => {
        cardSheetRef.current?.dismiss();
      };
      const onError = () => {
        showToast(t("vocabulary.decks.card.saveError"));
      };
      const onSettled = () => setCardSubmitting(false);

      if (editingCard) {
        updateCard.mutate(
          { id: editingCard.id, deckId, ...values },
          { onSuccess, onError, onSettled },
        );
      } else {
        addCard.mutate({ deckId, ...values }, { onSuccess, onError, onSettled });
      }
    },
    [editingCard, deckId, addCard, updateCard, showToast, t],
  );

  /** Kaldırma geri alınamıyor -- SM-2 planı da siliniyor. */
  const handleDeleteCard = useCallback(
    (card: CustomDeckCard) => {
      Alert.alert(
        t("vocabulary.decks.card.removeConfirmTitle", { surface: card.surface }),
        t("vocabulary.decks.card.removeConfirmBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("vocabulary.decks.card.removeConfirmCta"),
            style: "destructive",
            onPress: () => {
              deleteCard.mutate(
                { id: card.id, deckId },
                { onError: () => showToast(t("vocabulary.decks.card.removeError")) },
              );
            },
          },
        ],
      );
    },
    [t, deckId, deleteCard, showToast],
  );

  const handleRenameDeck = useCallback(
    (values: { name: string; colorKey: string }) => {
      setDeckSubmitting(true);
      renameDeck.mutate(
        { deckId, ...values },
        {
          onSuccess: () => renameSheetRef.current?.dismiss(),
          onError: () => showToast(t("vocabulary.decks.saveError")),
          onSettled: () => setDeckSubmitting(false),
        },
      );
    },
    [deckId, renameDeck, showToast, t],
  );

  /** Deste + içindeki tüm kartlar siliniyor (cascade, migration 045). */
  const handleDeleteDeck = useCallback(() => {
    if (!deck) return;
    Alert.alert(
      t("vocabulary.decks.removeConfirmTitle", { name: deck.name }),
      t("vocabulary.decks.removeConfirmBody", { count: deck.cardCount }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("vocabulary.decks.removeConfirmCta"),
          style: "destructive",
          onPress: () => {
            trackEvent("custom_deck_deleted_from_detail", { deck_id: deckId });
            deleteDeck.mutate(deckId, {
              onSuccess: onBack,
              onError: () => showToast(t("vocabulary.decks.removeError")),
            });
          },
        },
      ],
    );
  }, [deck, deckId, deleteDeck, onBack, showToast, t]);

  /**
   * DENETİM BULGUSU (2026-09-20, kod incelemesi): `deck` yalnızca
   * `useCustomDecksQuery`nin önbelleğinden bulunuyor -- o sorgu henüz
   * yüklenmemişken (soğuk önbellek, derin bağlantı) `deck` de `undefined`
   * oluyordu ve ekran hiçbir gösterge olmadan BOMBOŞ kalıyordu. Yükleniyor/
   * hata durumları artık kartlar sorgusuyla aynı özenle ele alınıyor;
   * yalnızca liste GERÇEKTEN yüklendiği hâlde bu id'de bir deste yoksa
   * (ör. başka bir sekmeden silindi) sessizce geri dönülüyor.
   */
  if (isDeckLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bg.primary }]}
        edges={["top"]}
      >
        <LoadingState message={t("vocabulary.decks.loading")} />
      </SafeAreaView>
    );
  }

  if (isDeckError) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bg.primary }]}
        edges={["top"]}
      >
        <ErrorState message={t("vocabulary.decks.error")} onRetry={() => void refetchDecks()} />
      </SafeAreaView>
    );
  }

  if (!deck) {
    return <DeckNotFoundRedirect onBack={onBack} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <ScreenHeader
        onBack={onBack}
        title={
          <View style={styles.headerTitleBlock}>
            <View style={[styles.swatch, { backgroundColor: deckColorHex(deck.colorKey) }]} />
            <Text
              style={[type.sectionHeading, styles.headerTitle, { color: theme.text.primary }]}
              numberOfLines={1}
            >
              {deck.name}
            </Text>
          </View>
        }
        right={
          <Pressable
            onPress={() => renameSheetRef.current?.present()}
            accessibilityRole="button"
            accessibilityLabel={t("vocabulary.decks.editTitle")}
            hitSlop={spacing.sm}
          >
            <Ionicons name="create-outline" size={22} color={theme.text.secondary} />
          </Pressable>
        }
      />

      {deck.dueCount > 0 ? (
        <View style={styles.reviewCta}>
          <Button
            label={t("vocabulary.decks.review.startCta", { count: deck.dueCount })}
            onPress={() => onStartReview(deckId)}
            fullWidth
          />
        </View>
      ) : null}

      {isLoading ? (
        <LoadingState message={t("vocabulary.decks.loading")} />
      ) : isError ? (
        <ErrorState message={t("vocabulary.decks.error")} onRetry={() => void refetch()} />
      ) : cards && cards.length > 0 ? (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DeckCardRow card={item} onEdit={handleOpenEditCard} onDelete={handleDeleteCard} />
          )}
          ItemSeparatorComponent={RowGap}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          title={t("vocabulary.decks.card.empty.title")}
          description={t("vocabulary.decks.card.empty.description")}
        />
      )}

      <View style={styles.footer}>
        <Button
          label={t("vocabulary.decks.card.addCta")}
          onPress={handleOpenAddCard}
          icon={<Ionicons name="add" size={18} color={theme.text.inverse} />}
          fullWidth
        />
        <Pressable
          onPress={handleDeleteDeck}
          accessibilityRole="button"
          style={({ pressed }) => (pressed ? { opacity: motion.pressed.opacity } : null)}
        >
          <UpperText style={[monoType.label, styles.deleteDeckLabel, { color: theme.danger }]}>
            {t("vocabulary.decks.removeCta")}
          </UpperText>
        </Pressable>
      </View>

      <AddEditCardSheet
        ref={cardSheetRef}
        initial={
          editingCard
            ? {
                surface: editingCard.surface,
                meaning: editingCard.meaning,
                exampleSentence: editingCard.exampleSentence,
              }
            : null
        }
        onSubmit={handleSubmitCard}
        submitting={cardSubmitting}
      />

      <CreateDeckSheet
        ref={renameSheetRef}
        initial={{ name: deck.name, colorKey: deck.colorKey }}
        onSubmit={handleRenameDeck}
        submitting={deckSubmitting}
      />
    </SafeAreaView>
  );
}

/**
 * Deste listesi yüklendi ama bu id'de bir deste yok (ör. az önce başka bir
 * yerden silindi). Navigasyonu render SIRASINDA değil bir `useEffect`
 * içinde tetikliyoruz -- render sırasında `onBack()` çağırmak React'in
 * "render sırasında yan etki yok" kuralını çiğner ve ebeveyn bileşende
 * render-esnasında state güncellemesi uyarısına yol açabilirdi.
 */
function DeckNotFoundRedirect({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    onBack();
  }, [onBack]);
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: "100%",
  },
  headerTitle: {
    flexShrink: 1,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
  },
  reviewCta: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.screenBottom,
    gap: spacing.md,
    alignItems: "center",
  },
  deleteDeckLabel: {
    textAlign: "center",
  },
});
