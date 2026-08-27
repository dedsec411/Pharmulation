import { describe, expect, it, vi, afterEach } from "vitest";
import { unwrap, unwrapList } from "./supabase-query";

const pgError = (message: string) =>
  ({ message, details: "", hint: "", code: "42501", name: "PostgrestError" }) as any;

afterEach(() => vi.restoreAllMocks());

describe("unwrapList", () => {
  it("returns the rows on success", () => {
    expect(unwrapList({ data: [1, 2, 3], error: null }, "things")).toEqual([1, 2, 3]);
  });

  it("treats a genuinely empty result as empty, not an error", () => {
    // This is the case that must NOT raise a false alarm: no rows is normal.
    expect(unwrapList({ data: [], error: null }, "things")).toEqual([]);
    expect(unwrapList({ data: null, error: null }, "things")).toEqual([]);
  });

  it("throws on a real failure instead of pretending there is no data", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // The whole point: an RLS denial used to render as an empty list.
    expect(() => unwrapList({ data: null, error: pgError("permission denied") }, "users"))
      .toThrow("Could not load users.");
  });

  it("keeps the raw database error out of the user-facing message but logs it", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      unwrapList({ data: null, error: pgError("permission denied for table profiles") }, "users");
    } catch (error) {
      expect((error as Error).message).not.toContain("permission denied");
    }
    expect(spy).toHaveBeenCalled();
  });
});

describe("unwrap", () => {
  it("passes through a single row, including null", () => {
    expect(unwrap({ data: { id: 1 }, error: null }, "row")).toEqual({ id: 1 });
    expect(unwrap({ data: null, error: null }, "row")).toBeNull();
  });

  it("throws on error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => unwrap({ data: null, error: pgError("boom") }, "your profile"))
      .toThrow("Could not load your profile.");
  });
});
