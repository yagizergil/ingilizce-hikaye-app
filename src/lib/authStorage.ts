import { Platform } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Supabase oturumunun saklandığı yer -- Keychain (iOS) / Keystore (Android).
 *
 * NEDEN AsyncStorage DEĞİL: AsyncStorage uygulamayla birlikte SİLİNİYOR.
 * Kullanıcı uygulamayı silip yeniden kurduğunda oturumu kayboluyordu, yani
 * yeni bir anonim hesap açılıyor ve onboarding'i baştan yapıyordu --
 * okuduğu kitaplar, kaydettiği kelimeler, serisi ve dil çifti o eski
 * hesapta kalıyordu.
 *
 * iOS'ta Keychain kayıtları uygulama silindiğinde SİLİNMEZ. Oturumu oraya
 * taşımak, kullanıcı geri geldiğinde aynı hesaba dönmesini sağlıyor:
 * onboarding atlanıyor, kütüphanesi olduğu gibi karşılıyor.
 *
 * PARÇALAMA NEDEN GEREKLİ: `expo-secure-store` değer başına 2048 baytla
 * sınırlı. Supabase oturumu (erişim jetonu + yenileme jetonu + kullanıcı
 * nesnesi) bunu rahatlıkla aşıyor; tek parça yazmaya çalışmak sessizce
 * başarısız oluyor ve oturum hiç kalıcı olmuyordu. Değer sabit boyutlu
 * parçalara bölünüp `<anahtar>.0`, `<anahtar>.1` ... olarak yazılıyor;
 * parça sayısı `<anahtar>` altında tutuluyor.
 *
 * WEB: `expo-secure-store` tarayıcıda yok. Orada AsyncStorage'a
 * düşülüyor -- web zaten yalnızca geliştirme önizlemesi için kullanılıyor.
 */

/** Güvenli tarafta kalmak için 2048'in altında bir parça boyutu. */
const CHUNK_SIZE = 1800;

const isWeb = Platform.OS === "web";

/**
 * DENETİM BULGUSU (2026-09-17): eski tek-jenerasyonlu şema ATOMİK DEĞİLDİ.
 * `writeChunked` önce `<key>.0`, `<key>.1`... parçalarını YERİNDE üzerine
 * yazıyor, sayaç başlığını (`<key>`) EN SONA bırakıyordu. Bu iki yazma
 * arasında (token yenilemesi sırasında iOS uygulamayı arka planda
 * askıya alır/sonlandırırsa -- bir gece boyunca kapalı kalan telefonda sık
 * karşılaşılan bir durum) süreç kesilirse: bazı parçalar YENİ içerikle,
 * kalanı ESKİ içerikle kalıyor ama başlık hâlâ ESKİ sayıyı gösteriyor --
 * bir sonraki okuma bu karışımı birleştirip bozuk bir JSON üretiyor,
 * Supabase oturumu geçersiz sayıp YENİ bir anonim hesap açıyordu. Kullanıcı
 * tarafında görünen sonuç: bir önceki gün tamamlanan onboarding, ertesi gün
 * yeniden karşısına çıkıyor ve kitapları/kelimeleri kayboluyor -- oysa asıl
 * veri sunucuda (eski anonim hesabın altında) sapasağlam duruyor, sadece
 * cihaz artık ona erişemiyor.
 *
 * DÜZELTME: iki jenerasyonlu (A/B) şema. Yeni değer HER ZAMAN henüz AKTİF
 * OLMAYAN jenerasyonun parça anahtarlarına yazılır -- aktif jenerasyonun
 * parçalarına hiç dokunulmaz. Tüm yeni parçalar başarıyla yazıldıktan SONRA
 * başlık (`<key>`, tek bir anahtar) yeni jenerasyonu işaret edecek şekilde
 * GÜNCELLENİR -- bu tek satır artık "commit" anı. Yazma süreci ne zaman
 * kesilirse kesilsin, başlık hâlâ ESKİ (tamamen sağlam) jenerasyonu
 * gösterir; en kötü ihtimalle bir önceki token yenilemesi kaybolur, ki bu
 * zararsızdır (Supabase bir sonraki açılışta yeniden yeniler).
 */
/**
 * DENETİM BULGUSU (bağımsız agent incelemesi, 2026-09-17): A/B jenerasyon
 * şeması TEK BİR çağrı kesintiye uğradığında güvenli, ama İKİ çağrı aynı
 * anahtara NEREDEYSE eş zamanlı gelirse (örn. token yenilemesi tetikleyen
 * bir `setItem` ile üst üste binen başka bir okuma/yazma) ikisi de aynı
 * "pasif" jenerasyonu hesaplayıp aynı parça anahtarlarına birbirinin
 * üzerine yazabilir -- jenerasyon değişmeden kalsa bile karışık içerik
 * riski doğardı. Aynı anahtar için tüm işlemleri (oku/yaz/sil) TEK BİR
 * sırada çalıştırarak (JS'in tek iş parçacıklı olay döngüsünde basit bir
 * promise zinciri yeterli) bu yarışı tamamen ortadan kaldırıyoruz.
 */
const keyLocks = new Map<string, Promise<unknown>>();

function withKeyLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = keyLocks.get(key) ?? Promise.resolve();
  const settled = previous.then(task, task);
  keyLocks.set(
    key,
    settled.catch(() => undefined),
  );
  return settled;
}

type ChunkHeader = { generation: "a" | "b"; count: number };

function parseHeader(header: string): ChunkHeader | null {
  if (header.startsWith("b:")) {
    const count = Number.parseInt(header.slice(2), 10);
    return Number.isInteger(count) && count >= 0 ? { generation: "b", count } : null;
  }
  const count = Number.parseInt(header, 10);
  return Number.isInteger(count) && count >= 0 ? { generation: "a", count } : null;
}

function chunkKey(key: string, generation: "a" | "b", index: number): string {
  // "a" jenerasyonu kasıtlı olarak eski (ön-jenerasyon) adlandırmayı
  // koruyor -- mevcut kullanıcıların oturumu bu değişiklikle birlikte
  // geçersiz sayılmasın.
  return generation === "a" ? `${key}.${index}` : `${key}.b.${index}`;
}

async function readChunked(key: string): Promise<string | null> {
  const header = await SecureStore.getItemAsync(key);
  if (header === null) return null;

  const parsed = parseHeader(header);
  // Parse edilemiyorsa bu, ilk (parçalanmamış) sürümden kalma bir kayıt --
  // başlığın kendisi değerin ta kendisi.
  if (!parsed) return header;

  const parts: string[] = [];
  for (let index = 0; index < parsed.count; index += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, parsed.generation, index));
    // Parçalardan biri kayıpsa değerin tamamı güvenilmez: oturumu yarım
    // geri yüklemektense yok saymak doğru.
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join("");
}

async function writeChunked(key: string, value: string): Promise<void> {
  const currentHeader = await SecureStore.getItemAsync(key);
  const currentGeneration = currentHeader?.startsWith("b:") ? "b" : "a";
  const nextGeneration = currentGeneration === "a" ? "b" : "a";

  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += CHUNK_SIZE) {
    chunks.push(value.slice(index, index + CHUNK_SIZE));
  }

  // Yeni parçalar PASİF jenerasyona yazılıyor -- aktif (okunmakta olan)
  // jenerasyonun verisi bu döngü boyunca hiç değişmiyor.
  for (let index = 0; index < chunks.length; index += 1) {
    await SecureStore.setItemAsync(chunkKey(key, nextGeneration, index), chunks[index] as string);
  }

  // TEK COMMIT ANI: başlık artık yeni jenerasyonu gösteriyor.
  const nextHeader = nextGeneration === "a" ? String(chunks.length) : `b:${chunks.length}`;
  await SecureStore.setItemAsync(key, nextHeader);

  // Artık pasif olan ESKİ jenerasyonun parçaları temizleniyor (best-effort;
  // bu adım yarıda kalsa bile veri bütünlüğünü etkilemez, sadece disk
  // artığı bırakır).
  if (currentHeader !== null) {
    const previous = parseHeader(currentHeader);
    if (previous) {
      for (let index = 0; index < previous.count; index += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, previous.generation, index));
      }
    }
  }
}

async function removeChunked(key: string): Promise<void> {
  const header = await SecureStore.getItemAsync(key);
  if (header !== null) {
    const parsed = parseHeader(header);
    if (parsed) {
      for (let index = 0; index < parsed.count; index += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, parsed.generation, index));
      }
    }
  }
  await SecureStore.deleteItemAsync(key);
}

/**
 * Supabase'in beklediği depo arayüzü.
 *
 * Hatalar YUTULMUYOR ama fırlatılmıyor da: Keychain erişimi (cihaz kilitli,
 * kurulum anı) nadiren başarısız olabiliyor ve bu durumda oturumu okumaya
 * çalışan Supabase'in çökmesi, oturumun kaybolmasından daha kötü. Hata
 * konsola düşüyor, çağrı null dönüyor.
 */
export const authStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(key);
    return withKeyLock(key, async () => {
      try {
        const secure = await readChunked(key);
        if (secure !== null) return secure;

        /**
         * TEK SEFERLİK TAŞIMA -- bu olmadan sürüm yükseltmesi her mevcut
         * kullanıcıyı çıkış yaptırırdı.
         *
         * Oturum bu sürüme kadar AsyncStorage'da tutuluyordu. Keychain boş
         * ama AsyncStorage dolu ise kullanıcı yükseltme yapmış demektir:
         * oturumu Keychain'e kopyalayıp devam ediyoruz. Kopyalamasaydık
         * Supabase "oturum yok" görüp yeni bir anonim hesap açar,
         * kullanıcının kitapları, kelimeleri ve serisi eski hesapta kalırdı.
         *
         * AsyncStorage kaydı SİLİNMİYOR: yazma başarısız olsaydı ve kaydı
         * silmiş olsaydık oturum tamamen kaybolurdu. Zararsız bir artık.
         */
        const legacy = await AsyncStorage.getItem(key);
        if (legacy === null) return null;
        await writeChunked(key, legacy);
        return legacy;
      } catch (error) {
        console.error(`authStorage.getItem failed for ${key}`, error);
        return null;
      }
    });
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) return AsyncStorage.setItem(key, value);
    return withKeyLock(key, async () => {
      try {
        await writeChunked(key, value);
      } catch (error) {
        console.error(`authStorage.setItem failed for ${key}`, error);
      }
    });
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) return AsyncStorage.removeItem(key);
    return withKeyLock(key, async () => {
      try {
        await removeChunked(key);
      } catch (error) {
        console.error(`authStorage.removeItem failed for ${key}`, error);
      }
    });
  },
};
