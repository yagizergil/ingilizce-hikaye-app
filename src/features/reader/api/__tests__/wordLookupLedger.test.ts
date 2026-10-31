import AsyncStorage from "@/lib/storage";
import {
  decideUnverifiedWordLookup,
  emptyLedger,
  flushOfflineWordLookups,
  LOOKUP_WINDOW_MS,
  PREMIUM_SNAPSHOT_MAX_AGE_MS,
  resolveUnverifiedWordLookup,
  saveQuotaSnapshot,
  noteWordLookup,
  type WordLookupLedger,
} from "@/features/reader/api/wordLookupLedger";

const NOW = 1_700_000_000_000;
const free = (remaining: number) => ({
  value: { isPremium: false, limit: 10, used: 10 - remaining, remaining },
  at: NOW - 1000,
});

function ledger(partial: Partial<WordLookupLedger>): WordLookupLedger {
  return { ...emptyLedger(), ...partial };
}

describe("decideUnverifiedWordLookup (sunucuya ulaşılamadığında)", () => {
  it("kota hiç bilinmiyorsa yeni kelime AÇILMAZ (fail-closed)", () => {
    expect(decideUnverifiedWordLookup(emptyLedger(), "run", NOW)).toBe("unavailable");
  });

  it("son 24 saatte açılmış kelime hak düşmeden açılır", () => {
    const l = ledger({ recent: [{ lemma: "run", at: NOW - 60_000 }] });
    expect(decideUnverifiedWordLookup(l, "run", NOW)).toBe("open_recent");
  });

  it("24 saatten eski açılış sayılmaz", () => {
    const l = ledger({ recent: [{ lemma: "run", at: NOW - LOOKUP_WINDOW_MS - 1 }] });
    expect(decideUnverifiedWordLookup(l, "run", NOW)).toBe("unavailable");
  });

  it("ücretsiz: kalan hak kadar açılır, çevrimdışı borçlar düşülür", () => {
    expect(decideUnverifiedWordLookup(ledger({ quota: free(2) }), "run", NOW)).toBe("open_offline");
    const twoPending = ledger({
      quota: free(2),
      pending: [
        { id: "a", at: NOW - 10 },
        { id: "b", at: NOW - 5 },
      ],
    });
    expect(decideUnverifiedWordLookup(twoPending, "run", NOW)).toBe("paywall");
  });

  it("ücretsiz ve hak bitmiş -> sunucunun reddiyle aynı yol (paywall)", () => {
    expect(decideUnverifiedWordLookup(ledger({ quota: free(0) }), "run", NOW)).toBe("paywall");
  });

  it("premium bilgisi 72 saate kadar geçerli, sonrası bilinmiyor sayılır", () => {
    const premium = (age: number) =>
      ledger({
        quota: {
          value: { isPremium: true, limit: null, used: 0, remaining: null },
          at: NOW - age,
        },
      });
    expect(decideUnverifiedWordLookup(premium(1000), "run", NOW)).toBe("open_premium");
    expect(decideUnverifiedWordLookup(premium(PREMIUM_SNAPSHOT_MAX_AGE_MS + 1), "run", NOW)).toBe(
      "unavailable",
    );
  });
});

describe("wordLookupLedger deposu", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("çevrimdışı açılış borç yazar; son hak bir kez kullanılır", async () => {
    await saveQuotaSnapshot({ isPremium: false, limit: 10, used: 9, remaining: 1 });
    const [first, second] = await Promise.all([
      resolveUnverifiedWordLookup("run"),
      resolveUnverifiedWordLookup("walk"),
    ]);
    expect(first).toBe("open_offline");
    expect(second).toBe("paywall");
    // Aynı kelime yeniden: hak düşmeden.
    expect(await resolveUnverifiedWordLookup("run")).toBe("open_recent");
  });

  it("sunucunun onayladığı kelime çevrimdışı yeniden açılır", async () => {
    await noteWordLookup("tree");
    expect(await resolveUnverifiedWordLookup("tree")).toBe("open_recent");
  });

  it("borçlar bağlantı gelince sunucuya yazılır ve düşülür", async () => {
    await saveQuotaSnapshot({ isPremium: false, limit: 10, used: 8, remaining: 2 });
    await resolveUnverifiedWordLookup("run");
    await resolveUnverifiedWordLookup("walk");

    const consume = jest.fn().mockResolvedValue({ allowed: true });
    await flushOfflineWordLookups(consume);
    expect(consume).toHaveBeenCalledTimes(2);

    consume.mockClear();
    await flushOfflineWordLookups(consume);
    expect(consume).not.toHaveBeenCalled();
  });

  it("hâlâ çevrimdışıysa borçlar kuyrukta kalır", async () => {
    await saveQuotaSnapshot({ isPremium: false, limit: 10, used: 8, remaining: 2 });
    await resolveUnverifiedWordLookup("run");

    const offline = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
    await flushOfflineWordLookups(offline);

    const consume = jest.fn().mockResolvedValue({ allowed: true });
    await flushOfflineWordLookups(consume);
    expect(consume).toHaveBeenCalledTimes(1);
  });

  it("premium çevrimdışı açılışı borç yazmaz", async () => {
    await saveQuotaSnapshot({ isPremium: true, limit: null, used: 0, remaining: null });
    expect(await resolveUnverifiedWordLookup("run")).toBe("open_premium");
    const consume = jest.fn().mockResolvedValue({ allowed: true });
    await flushOfflineWordLookups(consume);
    expect(consume).not.toHaveBeenCalled();
  });
});
