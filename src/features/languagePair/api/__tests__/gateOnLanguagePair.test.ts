import { gateOnLanguagePair } from "@/features/languagePair/api/gateOnLanguagePair";

import type { UseQueryResult } from "@tanstack/react-query";

type Q = UseQueryResult<unknown, Error>;

const disabled = {
  status: "pending",
  fetchStatus: "idle",
  isLoading: false,
  isError: false,
  data: undefined,
} as unknown as Q;

describe("gateOnLanguagePair", () => {
  it("dil çifti beklenirken hata değil yükleniyor diyor (açılıştaki hata ekranı)", () => {
    const pair = { isError: false, error: null } as unknown as Q;
    const result = gateOnLanguagePair(disabled, pair);
    expect(result.isLoading).toBe(true);
    expect(result.isError).toBe(false);
  });

  it("dil çiftinin kendisi alınamazsa hatayı bildiriyor", () => {
    const pair = { isError: true, error: new Error("x") } as unknown as Q;
    const result = gateOnLanguagePair(disabled, pair);
    expect(result.isLoading).toBe(false);
    expect(result.isError).toBe(true);
  });

  it("çalışan sorguya dokunmuyor", () => {
    const running = {
      status: "success",
      fetchStatus: "idle",
      isLoading: false,
      isError: false,
      data: [],
    } as unknown as Q;
    expect(gateOnLanguagePair(running, {} as Q)).toBe(running);
  });
});
