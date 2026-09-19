import AsyncStorage from "@/lib/storage";
import {
  enqueueWordAction,
  flushPendingWordActions,
  isLikelyOfflineError,
  type PendingWordAction,
} from "@/features/reader/api/offlineWordActionsQueue";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("offlineWordActionsQueue", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("appends actions to a FIFO array under one storage key", async () => {
    const first: PendingWordAction = { type: "save", lemma: "run", pos: "verb", queuedAt: 1 };
    const second: PendingWordAction = { type: "know", lemma: "walk", pos: "verb", queuedAt: 2 };

    await enqueueWordAction(first);
    await enqueueWordAction(second);

    const raw = await AsyncStorage.getItem("reader.pendingWordActions");
    expect(JSON.parse(raw as string)).toEqual([first, second]);
  });

  /**
   * Çevrimdışı hata: HER ŞEY kuyrukta kalır.
   *
   * `isLikelyOfflineError`, RN'in `fetch`inin bağlantı yokken fırlattığı
   * "Network request failed" TypeError'ını tanıyor.
   */
  it("çevrimdışı hatada durur ve kalan eylemleri kuyrukta bırakır", async () => {
    const first: PendingWordAction = { type: "save", lemma: "run", pos: "verb", queuedAt: 1 };
    const second: PendingWordAction = { type: "know", lemma: "walk", pos: "verb", queuedAt: 2 };
    await enqueueWordAction(first);
    await enqueueWordAction(second);

    const replayed: PendingWordAction[] = [];
    const replay = jest.fn(async (action: PendingWordAction) => {
      replayed.push(action);
      if (action.lemma === "walk") throw new TypeError("Network request failed");
    });

    await flushPendingWordActions(replay);

    expect(replayed).toEqual([first, second]);
    const raw = await AsyncStorage.getItem("reader.pendingWordActions");
    // "run" uygulandı ve düştü; "walk" hâlâ çevrimdışı, kuyrukta kalıyor.
    expect(JSON.parse(raw as string)).toEqual([second]);
  });

  /**
   * ÇÖZÜLEN HATA (2026-09-19): kalıcı bir ret kuyruğu SONSUZA DEK
   * tıkıyordu.
   *
   * Ücretsiz katmanda 49/50 kelimesi olan kullanıcı çevrimdışıyken iki kez
   * kaydediyor; bağlantı gelince ikincisi `enforce_saved_word_limit`
   * tetikleyicisine takılıyor -- deterministik, her denemede aynı sonucu
   * veren bir ret. Eski kod orada duruyordu, yani o eylemden SONRAKİ her
   * şey (yer açacak `unsave`'ler dahil) kurulumun ömrü boyunca bekliyordu.
   */
  it("kalıcı reddi DÜŞÜRÜR ve kuyruğun geri kalanını uygular", async () => {
    const blocked: PendingWordAction = { type: "save", lemma: "run", pos: "verb", queuedAt: 1 };
    const after: PendingWordAction = { type: "unsave", lemma: "walk", pos: "verb", queuedAt: 2 };
    await enqueueWordAction(blocked);
    await enqueueWordAction(after);

    const replayed: PendingWordAction[] = [];
    const replay = jest.fn(async (action: PendingWordAction) => {
      replayed.push(action);
      if (action.lemma === "run") throw new Error("saved_word_limit_reached");
    });

    await flushPendingWordActions(replay);

    // Kalıcı ret durdurmadı: sonraki eylem de denendi.
    expect(replayed).toEqual([blocked, after]);
    const raw = await AsyncStorage.getItem("reader.pendingWordActions");
    // Kuyruk tamamen boşaldı -- tıkanma yok.
    expect(JSON.parse(raw as string)).toEqual([]);
  });

  it("flush sürerken eklenen eylemi silmez", async () => {
    const first: PendingWordAction = { type: "save", lemma: "run", pos: "verb", queuedAt: 1 };
    const late: PendingWordAction = { type: "save", lemma: "late", pos: "noun", queuedAt: 9 };
    await enqueueWordAction(first);

    const replay = jest.fn(async () => {
      // Kullanıcı flush devam ederken bir kelimeye daha dokunuyor.
      await enqueueWordAction(late);
    });

    await flushPendingWordActions(replay);

    const raw = await AsyncStorage.getItem("reader.pendingWordActions");
    // Eski kod baştaki anlık görüntüyü dilimlediği için bunu siliyordu.
    expect(JSON.parse(raw as string)).toEqual([late]);
  });

  it("does nothing when the queue is empty", async () => {
    const replay = jest.fn();
    await flushPendingWordActions(replay);
    expect(replay).not.toHaveBeenCalled();
  });

  describe("isLikelyOfflineError", () => {
    it("treats RN's 'Network request failed' TypeError as offline", () => {
      expect(isLikelyOfflineError(new TypeError("Network request failed"))).toBe(true);
    });

    it("treats an unrelated TypeError as a real error", () => {
      expect(isLikelyOfflineError(new TypeError("Cannot read property 'x' of undefined"))).toBe(
        false,
      );
    });

    it("treats a Postgrest-shaped error object as a real error", () => {
      expect(isLikelyOfflineError({ code: "23505", message: "duplicate key value" })).toBe(false);
    });

    it("treats a timeout-flavored error message as offline", () => {
      expect(isLikelyOfflineError(new Error("The operation timed out"))).toBe(true);
    });
  });
});
