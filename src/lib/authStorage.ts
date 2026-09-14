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

async function readChunked(key: string): Promise<string | null> {
  const header = await SecureStore.getItemAsync(key);
  if (header === null) return null;

  const count = Number.parseInt(header, 10);
  // Eski (parçalanmamış) bir kayıt varsa başlık sayı değil, değerin
  // kendisidir -- olduğu gibi döndürülüyor.
  if (!Number.isInteger(count) || count < 0) return header;

  const parts: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const part = await SecureStore.getItemAsync(`${key}.${index}`);
    // Parçalardan biri kayıpsa değerin tamamı güvenilmez: oturumu yarım
    // geri yüklemektense yok saymak doğru.
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join("");
}

async function writeChunked(key: string, value: string): Promise<void> {
  const previous = await SecureStore.getItemAsync(key);
  const previousCount = previous ? Number.parseInt(previous, 10) : 0;

  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += CHUNK_SIZE) {
    chunks.push(value.slice(index, index + CHUNK_SIZE));
  }

  for (let index = 0; index < chunks.length; index += 1) {
    await SecureStore.setItemAsync(`${key}.${index}`, chunks[index] as string);
  }
  await SecureStore.setItemAsync(key, String(chunks.length));

  // Değer kısaldıysa artakalan eski parçalar temizleniyor; kalsalardı bir
  // sonraki okuma onları da birleştirip bozuk bir oturum üretirdi.
  if (Number.isInteger(previousCount)) {
    for (let index = chunks.length; index < previousCount; index += 1) {
      await SecureStore.deleteItemAsync(`${key}.${index}`);
    }
  }
}

async function removeChunked(key: string): Promise<void> {
  const header = await SecureStore.getItemAsync(key);
  const count = header ? Number.parseInt(header, 10) : 0;
  if (Number.isInteger(count)) {
    for (let index = 0; index < count; index += 1) {
      await SecureStore.deleteItemAsync(`${key}.${index}`);
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
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) return AsyncStorage.setItem(key, value);
    try {
      await writeChunked(key, value);
    } catch (error) {
      console.error(`authStorage.setItem failed for ${key}`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) return AsyncStorage.removeItem(key);
    try {
      await removeChunked(key);
    } catch (error) {
      console.error(`authStorage.removeItem failed for ${key}`, error);
    }
  },
};
