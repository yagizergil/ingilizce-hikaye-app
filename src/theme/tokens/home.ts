/**
 * Design token: ana sayfa (Funfluent referansı, 2026-10-04).
 *
 * KAYNAK: `hikayeads/funfluent/ekranlar/07_ana_sayfa` ve
 * `08_ana_sayfa_kitap_rafi` anahtar kareleri (768 px geniş). Ölçüler
 * piksel ölçülüp 390 pt'lik ekrana çevrildi (1 px = 0,508 pt).
 *
 * Ana sayfa resim ağırlıklı ve açık zeminli bir ekran; renkleri tema
 * (light/sepia/dark) değil bu paletten gelir, bu yüzden hex burada.
 * Yazı tipi Gabarito (`fontFamily.gabarito*`), yalnızca ana sayfada ve
 * alt gezinti çubuğunda kullanılır.
 */

import { fontFamily } from "@/theme/tokens/typography";

/** Tek ekran kenarı (2026-10-06): eskiden ana sayfa 16, Ara 20, detay
 * ekranları 25 pt idi; sayfalar arası geçişte içerik yana kayıyordu. */
export const SCREEN_GUTTER = 20;

export const homeColors = {
  /** Karşılama metni: koyu lacivert (örneklenen #002233). */
  greeting: "#002233",
  /** Sahne görselinin en üst satırı: durum çubuğu arkasını dolduruyor. */
  sky: "#79CEF5",
  ink: "#222222",
  valueInk: "#1C1C1C",
  pillText: "#4A4D4B",
  // #A5A5A5 beyazda 2.4:1 idi (ikincil metin okunmuyordu); #6E6E73 4.9:1.
  muted: "#6E6E73",
  mutedStrong: "#808080",
  categoryLabel: "#8F8F8F",
  card: "#FFFFFF",
  pillBg: "#FFFFFF",
  hairline: "#F3F1ED",
  orange: "#FE9201",
  orangeTrack: "#F5E6D3",
  coin: "#FFD84D",
  coinInk: "#C68A00",
  /** Kategori dairesi ve istatistik ikon zemini (örneklenen #F8D8AE). */
  peach: "#FBE6C8",
  green: "#B6CB5A",
  greenDeep: "#6E8B1F",
  ribbonBg: "#F9DEBE",
  ribbonInk: "#6B4217",
  /** Aktif sekmenin soluk sarı dairesi (örneklenen amber #F5B531; ikon ve etiket koyu kahve #4E251F). */
  tabActiveBg: "#F5B531",
  tabActiveIcon: "#4E251F",
  tabIcon: "#868686",
  shadow: "#1A1A2E",
  spine: "rgba(0, 0, 0, 0.14)",
  /** Üç boyutlu kitap kapağı (BookCover3D): sırt gölgesi, kırışık ışığı, sayfa blokları. */
  bookSpineShade: "rgba(0, 0, 0, 0.30)",
  bookSpineHighlight: "rgba(255, 255, 255, 0.45)",
  bookCreaseShade: "rgba(0, 0, 0, 0.10)",
  bookPages: "#F7F1E6",
  bookPagesEdge: "#E7DCCA",
  ribbonFold: "#D9B78F",
  finished: "#3FA66B",
} as const;

/**
 * Maskot boyut ölçeği (MascotAnim `width` = sığdırma kutusu, uzun kenar).
 * Çağrı yerlerinde aritmetik YOK (`*1.6`, `+ xl` gibi): eskiden dört ayrı
 * token ve çarpanlar yüzünden aynı rol ekrandan ekrana farklı boydaydı ve
 * yeni dikey pozlarla bazı başlıklarda maskot başlığı aşıyordu.
 */
export const mascotSize = {
  /** SkyHeader `art` ve ekran başlıkları. */
  header: 112,
  /** Kartların içindeki maskot (devam, premium, quiz kahramanı). */
  card: 96,
  /** Boş/hata durumları. */
  empty: 150,
  /** Bölüm/kitap bitişi. */
  celebration: 160,
  /** Paywall kahramanı. */
  hero: 190,
} as const;

export const homeMetrics = {
  /** Gökyüzü + çayır sahnesi (güvenli alanın altından, kartın üst kenarına kadar + bindirme). */
  sceneHeight: 312,
  /** İstatistik kartı sahnenin ne kadar içine biniyor. */
  cardOverlap: 37,
  gutter: SCREEN_GUTTER,
  pillTop: 11,
  pillHeight: 44,
  pillRadius: 22,
  pillCoin: 24,
  levelPillWidth: 116,
  streakPillWidth: 66,
  languagePillWidth: 79,
  pillGap: 10,
  levelBarHeight: 4,
  levelBarWidth: 54,
  greetingTop: 80,
  parrotTop: 118,
  parrotWidth: 128,
  parrotHeight: 124,
  cardRadius: 26,
  cardPadding: 18,
  cardPaddingBottom: 26,
  cardMinHeight: 198,
  cardIcon: 60,
  statIcon: 40,
  categoryColumns: 4,
  categoryCircle: 64,
  categoryRowGap: 20,
  /** 08 karesi ~1,34x yakınlaştırılmış; ölçüler buna bölünerek alındı. */
  shelfCardWidth: 158,
  shelfCoverHeight: 193,
  shelfCoverRadius: 6,
  shelfGap: 20,
  ribbonHeight: 27,
  spineWidth: 11,
  avatar: 20,
  sectionTop: 24,
  sectionHeadBottom: 14,
  /** Alt gezinti: yüzen beyaz hap (07 karesinden ölçüldü). */
  continueCover: 76,
  continueButton: 34,
  weekCircle: 36,
  weekRing: 2,
  startMascot: 112,
  stepIcon: 52,
  profileSkyExtra: 40,
  statTileIcon: 48,
  paywallSky: 360,
  paywallMascot: 200,
  rowIcon: 40,
  tabBarHeight: 82,
  tabBarMargin: 28,
  tabBarRadius: 30,
  tabCircle: 65,
  tabIconSize: 22,
  tabContentTop: 4,
  tabLabelGap: 7,
} as const;

/** Gabarito ölçeği: font boyutu ve satır yüksekliği referans ölçümünden. */
/**
 * Gabarito ölçeği: font boyutu ve satır yüksekliği referans ölçümünden.
 *
 * 2026-10-05 ince ayar (kullanıcı bulgusu: "soft değil"): referans kare ile
 * aynı ölçekte karşılaştırıldı -- "Book category" glif yüksekliği 14,2 pt,
 * bizimki 16 pt idi; kart sayısı/alt yazılar da %7-20 büyüktü ve hepsi 700
 * kalınlığındaydı. Başlıklar ve sayılar 600'e, ölçüler referansa indi.
 * Metin rengi saf siyah değil (#222 / #1F1F1F ölçüldü).
 */
export const homeType = {
  pillLabel: {
    fontFamily: fontFamily.gabaritoSemiBold,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  pillValue: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: "700",
  },
  coinGlyph: {
    fontFamily: fontFamily.gabaritoExtraBold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
  },
  greeting: {
    fontFamily: fontFamily.gabaritoMedium,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "500",
  },
  greetingName: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "700",
  },
  cardTitle: {
    fontFamily: fontFamily.gabaritoSemiBold,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
  cardSub: {
    fontFamily: fontFamily.gabaritoMedium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  cardSection: {
    fontFamily: fontFamily.gabaritoSemiBold,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  statValue: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
  },
  statLabel: {
    fontFamily: fontFamily.gabaritoMedium,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "500",
  },
  sectionTitle: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "700",
  },
  seeAll: {
    fontFamily: fontFamily.gabaritoSemiBold,
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "600",
  },
  categoryLabel: {
    fontFamily: fontFamily.gabaritoRegular,
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: "400",
  },
  bookTitle: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "700",
  },
  bookAuthor: {
    fontFamily: fontFamily.gabaritoMedium,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "500",
  },
  ribbon: {
    fontFamily: fontFamily.gabaritoMedium,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "500",
  },
  tabLabelActive: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
  },
  tabLabel: {
    fontFamily: fontFamily.gabaritoRegular,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "400",
  },
} as const;

/** Bölüm başlıkları arası ve iç boşluklar (spacing ölçeğinde olmayan ince adımlar). */
export const homeSpace = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pillInner: 8,
  pillGap: 8,
} as const;

/**
 * "Discover" (Ara sekmesi) -- referans: kullanıcının gönderdiği ekran
 * görüntüsü (telefon 222 px = 390 pt, 1 px = 1,757 pt). Konumlar güvenli
 * alanın üstünden (S) itibaren pt.
 */
export const searchColors = {
  skyTop: "#C6E5F6",
  skyBottom: "#FFFFFF",
  title: "#0A0A0A",
  subtitle: "#8A9094",
  field: "#F8F8FA",
  fieldBorder: "#EEEEF1",
  fieldIcon: "#2E2C30",
  placeholder: "#8E8E8F",
  chipText: "#333333",
  rowText: "#272727",
  rowPressed: "#E6F9D0",
  rowPressedBorder: "#CFE29A",
} as const;

export const searchMetrics = {
  gutter: SCREEN_GUTTER,
  textLeft: 23,
  titleTop: 104,
  subtitleTop: 147,
  fieldTop: 197,
  fieldHeight: 52,
  fieldRadius: 26,
  fieldIcon: 22,
  fieldGap: 10,
  inputPadding: 0,
  chipsTop: 275,
  chipHeight: 32,
  chipIcon: 22,
  chipGap: 24,
  chipIconGap: 6,
  popularTop: 334,
  /**
   * Ara başlığındaki maskotun sığdırma kutusu. Dikey pozda (büyüteçli
   * papağan) yükseklik bu değer olur; üst (treeTop) + kutu, arama alanının
   * (fieldTop) en az 10 pt üstünde bitmeli. Eski 190x150 yatay "dal" görseli
   * içindi ve yeni pozla maskot arama kutusunun içine taşıyordu.
   */
  treeWidth: 124,
  treeTop: 62,
  treeRight: 18,
  rowPitch: 66,
  rowHeight: 60,
  rowRadius: 30,
  rowAvatar: 32,
  rowTextLeft: 14,
} as const;

export const searchType = {
  title: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
  },
  subtitle: {
    fontFamily: fontFamily.gabaritoRegular,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
  },
  placeholder: {
    fontFamily: fontFamily.gabaritoRegular,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
  },
  chip: {
    fontFamily: fontFamily.gabaritoMedium,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
  },
  row: {
    fontFamily: fontFamily.gabaritoMedium,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "500",
  },
  rowSub: {
    fontFamily: fontFamily.gabaritoRegular,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
  },
} as const;

/**
 * Kitap detayı, okuyucu, dinleme modu, sözlük kartı ve yükleniyor ekranı
 * (referans: kullanıcının gönderdiği 6 ekran; telefon ~665 px = 390 pt,
 * 1 px = 0,585 pt). Yazı boyutları metin genişliklerinden Gabarito ile
 * hesaplandı.
 */
export const detailColors = {
  amber: "#F5B531",
  amberInk: "#4E251F",
  amberDeep: "#E08A0A",
  // Saf siyaha yakın değil: referansta başlıklar #1F1F1F-#222 ölçüldü.
  title: "#222222",
  muted: "#8F8F8F",
  body: "#7A7A7A",
  green: "#4D8C1F",
  greenDark: "#3E7A18",
  pillDark: "#1B1116",
  circle: "#FFFFFF",
  circleBorder: "#ECECEC",
  chipBorder: "#E4E4E4",
  chipText: "#6B6B6B",
  wordHighlight: "#F8D9A8",
  listenBg: "#6B4234",
  listenText: "#FFF1E3",
  listenDim: "#C9A998",
  progressTrack: "#E4E4E4",
  progressFill: "#4EA11B",
  scrim: "rgba(0, 0, 0, 0.35)",
  pageFlip: "#F7D2E8",
  pageFlipEdge: "#DB92C2",
  emojiFace: "#F9B233",
  emojiInk: "#6B3A10",
  emojiTeeth: "#FFFFFF",
} as const;

export const detailMetrics = {
  heroHeight: 328,
  coverTop: 132,
  coverWidth: 211,
  coverHeight: 250,
  roundButton: 41,
  buttonTop: 70,
  buttonGap: 8,
  titleTop: 416 - 16,
  statIcon: 42,
  statColumn: 110,
  statTop: 531,
  ctaHeight: 53,
  ctaBottom: 20,
  gutter: SCREEN_GUTTER,
  authorAvatar: 24,
  sheetRadius: 28,
  speaker: 50,
  menuButton: 41,
  skyHeader: 140,
  profileOverlap: 40,
  skyArtTextInset: 132,
  profileAvatar: 64,
  profileChip: 24,
  skyArtTop: 14,
  skyBackTop: 11,
  skyTextBottom: 18,
  categoriesHeader: 150,
  categoriesTitleBottom: 34,
  categoriesGap: 12,
  categoriesCardHeight: 150,
  arrowButton: 32,
  headerTop: 12,
  headerGap: 12,
  pillWidth: 99,
  pillHeight: 51,
  pillCircle: 45,
  pillPad: 3,
  listenTextHeight: 200,
  handleWidth: 36,
  handleHeight: 4,
  chipHeight: 32,
  sheetFooter: 124,
  listenPlay: 54,
  listenSide: 40,
  progressHeight: 5,
  progressKnob: 12,
  mascot: 120,
} as const;

export const detailType = {
  heroTitle: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700",
  },
  author: {
    fontFamily: fontFamily.gabaritoMedium,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
  },
  statLabel: {
    fontFamily: fontFamily.gabaritoMedium,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  sectionTitle: {
    fontFamily: fontFamily.gabaritoSemiBold,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
  cta: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 16.5,
    lineHeight: 22,
    fontWeight: "700",
  },
  sheetTitle: {
    fontFamily: fontFamily.gabaritoSemiBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  sheetWord: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  sheetLabel: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  // 13 pt'de diğer anlamlar ve örnek cümle okunmuyordu; gövde metni 15 pt.
  sheetBody: {
    fontFamily: fontFamily.gabaritoRegular,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  sheetChip: {
    fontFamily: fontFamily.gabaritoRegular,
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: "400",
  },
  sheetMore: {
    fontFamily: fontFamily.gabaritoSemiBold,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
  },
  loadingTitle: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 27.5,
    lineHeight: 34,
    fontWeight: "700",
  },
  loadingSub: {
    fontFamily: fontFamily.gabaritoRegular,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
  },
  pageCount: {
    fontFamily: fontFamily.gabaritoRegular,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
  },
  pageCountBold: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
  },
  time: {
    fontFamily: fontFamily.gabaritoRegular,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
  },
} as const;

/** Kitap detayındaki özet metni: referansta ince, gri bir serif. */
export const synopsisType = {
  fontFamily: fontFamily.literataRegular,
  fontSize: 16,
  lineHeight: 29,
  fontWeight: "400",
} as const;

/** Kategori kartlarının yumuşak arka plan tonları (açık krem, yeşil, gökyüzü, leylak). */
export const categoryTints = [
  "#FCE6CB",
  "#E6F2CC",
  "#D9EEFA",
  "#EBE3F8",
  "#FADCDC",
  "#FFF0B8",
] as const;

/**
 * Quiz soru ekranı (referans: kullanıcının gönderdiği ekran; telefon
 * 233 px = 390 pt, 1 px = 1,674 pt). Konumlar ekranın üstünden pt.
 */
export const quizColors = {
  selected: "#5CA21A",
  radioRing: "#D6D6D6",
  divider: "#F0F0F0",
  option: "#2B2B2B",
  progressTrack: "#F3DCC0",
  // Kitap quizi geri bildirimi (2026-10-05): seçenek kartları ve doğru/yanlış.
  /** Quiz başlık görselinin (quiz-header.webp) üst kenar rengi; güvenli alan şeridi. */
  headerSky: "#B0DCF4",
  optionBg: "#F7F5F0",
  optionBorder: "#ECE7DD",
  correctBg: "#EAF6DD",
  correctInk: "#3F7A0C",
  wrongBg: "#FDECEB",
  wrong: "#D9473F",
  levelEasy: "#E9F6DC",
  levelMid: "#FFF1D6",
  levelHard: "#FDE4DC",
} as const;

export const quizMetrics = {
  sheetTop: 372,
  sheetRadius: 30,
  questionTop: 18,
  optionsTop: 16,
  optionHeight: 54,
  optionRadius: 27,
  radio: 22,
  radioDot: 10,
  buttonHeight: 50,
  buttonBottom: 18,
  closeTop: 64,
  pillWidth: 98,
  pillHeight: 34,
  pillBar: 4,
  pillLeaf: 22,
  resultMascot: 150,
  homeMascot: 96,
  sceneHeight: 185,
  optionMinHeight: 50,
  optionCardRadius: 18,
  levelBadge: 28,
  shelfCover: 96,
} as const;

export const quizType = {
  question: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
  },
  option: {
    fontFamily: fontFamily.gabaritoMedium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  optionSelected: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  pill: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
  resultTitle: {
    fontFamily: fontFamily.gabaritoBold,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
  },
} as const;
