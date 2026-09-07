// Thin re-export: the generic badge now lives in
// src/components/ui/LevelBadge.tsx (design-token/UI-kit rework). Kept
// here, typed against this feature's `Level` union, so existing imports
// of "@/features/library/components/LevelBadge" and the feature's barrel
// (src/features/library/index.ts) keep compiling unchanged.
import { LevelBadge as UiLevelBadge } from "@/components/ui/LevelBadge";

import type { Level } from "@/features/library/types";

interface LevelBadgeProps {
  level: Level;
}

export function LevelBadge({ level }: LevelBadgeProps) {
  return <UiLevelBadge level={level} />;
}
