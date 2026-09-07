/**
 * DEPRECATED — superseded by `FilterTab.tsx`. The mockups' filter-row
 * pattern (library.html / vocabulary.html `.filters .f`) is flat mono text
 * with an accent underline on the active item, not a filled pill — this
 * old `Chip` shape (background fill, rounded pill border) doesn't match
 * any of the six mockups this design-tokens pass covers. Kept only as a
 * thin re-export so the file still compiles if anything referenced it
 * (nothing in the codebase did at the time of this rewrite — verified via
 * grep before deleting the old implementation); prefer importing
 * `FilterTab` directly. Not exported from `index.ts` — see that file.
 */
export { FilterTab as Chip } from "@/components/ui/FilterTab";
