import { resolveChapterAudioAccess } from "../../../../../supabase/functions/chapter-audio/access";

import type { RpcCaller, RpcResult } from "../../../../../supabase/functions/chapter-audio/access";

/**
 * chapter-audio Edge Function'ının erişim kararı (migration 110). Yeni
 * fonksiyon canlıda yoksa eski kitap bazlı kurala geri düşmeli ki deploy
 * sırası bir şeyi bozmasın.
 */
const SECTION = { id: "s1", book_id: "b1" };

function caller(results: Record<string, RpcResult>): {
  rpc: RpcCaller;
  calls: [string, Record<string, unknown>][];
} {
  const calls: [string, Record<string, unknown>][] = [];
  const rpc: RpcCaller = (fn, args) => {
    calls.push([fn, args]);
    const result = results[fn];
    if (!result) throw new Error(`unexpected rpc ${fn}`);
    return Promise.resolve(result);
  };
  return { rpc, calls };
}

describe("resolveChapterAudioAccess", () => {
  it("bölüm bazlı fonksiyonu bölüm kimliğiyle sorar", async () => {
    const { rpc, calls } = caller({ can_play_section_audio: { data: true, error: null } });
    await expect(resolveChapterAudioAccess(rpc, SECTION)).resolves.toEqual({
      kind: "allowed",
      via: "section",
    });
    expect(calls).toEqual([["can_play_section_audio", { p_section_id: "s1" }]]);
  });

  it("false ise kilitli, geri düşmez", async () => {
    const { rpc, calls } = caller({ can_play_section_audio: { data: false, error: null } });
    await expect(resolveChapterAudioAccess(rpc, SECTION)).resolves.toEqual({
      kind: "locked",
      via: "section",
    });
    expect(calls).toHaveLength(1);
  });

  it.each(["PGRST202", "42883"])(
    "fonksiyon yoksa (%s) can_play_book_audio'ya geri düşer",
    async (code) => {
      const { rpc, calls } = caller({
        can_play_section_audio: { data: null, error: { code, message: "missing" } },
        can_play_book_audio: { data: true, error: null },
      });
      await expect(resolveChapterAudioAccess(rpc, SECTION)).resolves.toEqual({
        kind: "allowed",
        via: "book_fallback",
      });
      expect(calls[1]).toEqual(["can_play_book_audio", { p_book_id: "b1" }]);
    },
  );

  it("geri düşmede premium değilse kilitli", async () => {
    const { rpc } = caller({
      can_play_section_audio: { data: null, error: { code: "PGRST202", message: "missing" } },
      can_play_book_audio: { data: false, error: null },
    });
    await expect(resolveChapterAudioAccess(rpc, SECTION)).resolves.toEqual({
      kind: "locked",
      via: "book_fallback",
    });
  });

  it("başka hatada geri düşmez, hata döner", async () => {
    const { rpc, calls } = caller({
      can_play_section_audio: { data: null, error: { code: "57014", message: "timeout" } },
    });
    await expect(resolveChapterAudioAccess(rpc, SECTION)).resolves.toEqual({
      kind: "error",
      message: "timeout",
    });
    expect(calls).toHaveLength(1);
  });

  it("geri düşme de hata verirse hata döner", async () => {
    const { rpc } = caller({
      can_play_section_audio: { data: null, error: { code: "42883", message: "missing" } },
      can_play_book_audio: { data: null, error: { message: "boom" } },
    });
    await expect(resolveChapterAudioAccess(rpc, SECTION)).resolves.toEqual({
      kind: "error",
      message: "boom",
    });
  });
});
