import { View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";

import { SectionHeader } from "@/components/ui";
import { CategoryTagCard } from "@/features/home/components/CategoryTagCard";

import type { CategoryTag } from "@/features/home/types";
import { shelfStyles } from "@/features/home/components/shelfLayout";

interface CategoryShelfProps {
  title: string;
  tags: CategoryTag[];
  onPressTag: (tag: CategoryTag) => void;
}

/**
 * Horizontal shelf of `CategoryTagCard`s — the "Türler ve Konular" and
 * "Yazarlar ve Seriler" home sections. Hides itself when `tags` is empty
 * (unlike `BookShelf`, which leaves that decision to its caller) since
 * both call sites in app/(tabs)/index.tsx would otherwise need to repeat
 * the same `tags.length > 0` guard.
 */
export function CategoryShelf({ title, tags, onPressTag }: CategoryShelfProps) {
  if (tags.length === 0) return null;

  const renderItem: ListRenderItem<CategoryTag> = ({ item }) => (
    <CategoryTagCard tag={item} onPress={onPressTag} />
  );

  return (
    <View style={shelfStyles.container}>
      <SectionHeader title={title} style={shelfStyles.head} />
      <FlashList
        horizontal
        data={tags}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={shelfStyles.listContent}
      />
    </View>
  );
}
