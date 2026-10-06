import { StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";

import { homeColors, homeType } from "@/theme";

import type { ReactNode } from "react";

interface BookCover3DProps {
  uri: string | null;
  width: number;
  height: number;
  /** Sağ üstte kenardan taşan katlı etiket (tür adı). */
  ribbon?: string;
  /** Kapak görseli yoksa gösterilecek yer tutucu. */
  fallback?: ReactNode;
  /** Kapağın üstüne bindirilen ek içerik (ör. "okundu" rozeti). */
  children?: ReactNode;
}

/**
 * Kapak görselini GERÇEK BİR KİTAP gibi çizer (Funfluent referansı).
 *
 * Neden (2026-10-05, kullanıcı bulgusu: "kitap gibi gözükmüyor"): kapaklar
 * köşesi yuvarlatılmış düz bir resimdi. Referanstaki kitap hissi dört
 * küçük ayrıntıdan geliyor ve hepsi burada:
 *  1. Sol kenarda kapağın kendi renginden koyulaşan bir SIRT ve hemen
 *     yanında ince bir ışık çizgisi (cildin kırıldığı yer).
 *  2. Sağ ve alt kenarın arkasında iki katmanlı krem SAYFA BLOĞU.
 *  3. Sağ üstte kenardan taşan, ucu katlanmış bir ETİKET.
 *  4. Yumuşak, aşağı düşen bir GÖLGE. Köşeler sırtta keskin, ön kenarda
 *     yuvarlak (gerçek ciltte olduğu gibi).
 *
 * Bütün ölçüler kapak genişliğine oranlı; aynı bileşen rafta (158 pt) ve
 * kitap detayında (~210 pt) aynı görünüyor.
 */
export function BookCover3D({ uri, width, height, ribbon, fallback, children }: BookCover3DProps) {
  const spine = Math.max(6, Math.round(width * 0.055));
  const pages = Math.max(3, Math.round(width * 0.022));
  const frontRadius = Math.max(4, Math.round(width * 0.035));
  const ribbonHeight = Math.max(20, Math.round(width * 0.12));

  return (
    <View style={[styles.wrap, { width: width + pages, height: height + pages }]}>
      {/* Sayfa blokları: kapağın sağ-alt arkasında iki krem katman. */}
      <View
        style={[
          styles.pagesBack,
          {
            left: spine,
            top: pages,
            width: width - spine + pages,
            height,
            borderTopRightRadius: frontRadius,
            borderBottomRightRadius: frontRadius,
          },
        ]}
      />
      <View
        style={[
          styles.pagesFront,
          {
            left: spine,
            top: pages / 2,
            width: width - spine + pages / 2,
            height: height + pages / 2,
            borderTopRightRadius: frontRadius,
            borderBottomRightRadius: frontRadius,
          },
        ]}
      />

      <View
        style={[
          styles.cover,
          {
            width,
            height,
            borderTopRightRadius: frontRadius,
            borderBottomRightRadius: frontRadius,
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.fill}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={uri}
            accessibilityIgnoresInvertColors
          />
        ) : (
          fallback
        )}
        {/* Sırt: kapağın kendi renginin koyusu + kırışık ışığı + yumuşak gölge. */}
        <View style={[styles.spineShade, { width: spine }]} />
        <View style={[styles.spineHighlight, { left: spine }]} />
        <View style={[styles.crease, { left: spine + 1, width: spine * 0.6 }]} />
        {children}
      </View>

      {ribbon ? (
        <View style={[styles.ribbonWrap, { top: Math.round(height * 0.06), right: 0 }]}>
          <View
            style={[
              styles.ribbon,
              {
                height: ribbonHeight,
                borderTopLeftRadius: ribbonHeight / 2,
                borderBottomLeftRadius: ribbonHeight / 2,
                paddingHorizontal: Math.round(ribbonHeight * 0.45),
                maxWidth: width * 0.78,
              },
            ]}
          >
            <Text style={[homeType.ribbon, styles.ribbonText]} numberOfLines={1}>
              {ribbon}
            </Text>
          </View>
          {/* Katlanan uç: etiketin kapak kenarının arkasına kıvrıldığı yer. */}
          <View
            style={[styles.ribbonFold, { borderTopWidth: pages + 2, borderRightWidth: pages + 2 }]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  pagesBack: {
    position: "absolute",
    backgroundColor: homeColors.bookPagesEdge,
  },
  pagesFront: {
    position: "absolute",
    backgroundColor: homeColors.bookPages,
  },
  cover: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
    backgroundColor: homeColors.peach,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  fill: {
    width: "100%",
    height: "100%",
  },
  spineShade: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: homeColors.bookSpineShade,
  },
  spineHighlight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: homeColors.bookSpineHighlight,
  },
  crease: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: homeColors.bookCreaseShade,
  },
  ribbonWrap: {
    position: "absolute",
    alignItems: "flex-end",
  },
  ribbon: {
    backgroundColor: homeColors.ribbonBg,
    justifyContent: "center",
  },
  ribbonText: {
    color: homeColors.ribbonInk,
  },
  ribbonFold: {
    width: 0,
    height: 0,
    borderTopColor: homeColors.ribbonFold,
    borderRightColor: "transparent",
  },
});
