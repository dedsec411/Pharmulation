import { describe, expect, it } from "vitest";
import { newSeed, rankParticipants, sessionProgress, type LiveParticipant } from "./session";

const p = (over: Partial<LiveParticipant>): LiveParticipant => ({
  id: over.display_name ?? "x", session_id: "s", user_id: over.display_name ?? "u",
  display_name: "Anon", joined_at: "2026-09-13T10:00:00Z",
  score: null, errors: null, finished_at: null, ...over,
});

describe("rankParticipants", () => {
  it("puts the best finished score at the top", () => {
    const rows = [
      p({ display_name: "Sara", score: 80, finished_at: "2026-09-13T10:05:00Z" }),
      p({ display_name: "Bilal", score: 140, finished_at: "2026-09-13T10:06:00Z" }),
    ];
    expect(rankParticipants(rows).map((r) => r.display_name)).toEqual(["Bilal", "Sara"]);
  });

  /**
   * Ranking somebody mid-drill would have the board reshuffling under them,
   * and would put a fast wrong answer above a careful right one.
   */
  it("keeps everybody still playing below everybody who has finished", () => {
    const rows = [
      p({ display_name: "Playing", score: 200 }),
      p({ display_name: "Finished", score: 10, finished_at: "2026-09-13T10:05:00Z" }),
    ];
    expect(rankParticipants(rows).map((r) => r.display_name)).toEqual(["Finished", "Playing"]);
  });

  it("orders those still playing by when they joined, not by score", () => {
    const rows = [
      p({ display_name: "Late", joined_at: "2026-09-13T10:03:00Z", score: 90 }),
      p({ display_name: "Early", joined_at: "2026-09-13T10:01:00Z" }),
    ];
    expect(rankParticipants(rows).map((r) => r.display_name)).toEqual(["Early", "Late"]);
  });

  // The board is polled every two seconds, so an unstable sort makes it
  // flicker in front of a room.
  it("breaks a tie the same way every poll", () => {
    const rows = [
      p({ display_name: "Zoya", score: 100, finished_at: "2026-09-13T10:05:00Z" }),
      p({ display_name: "Adil", score: 100, finished_at: "2026-09-13T10:05:00Z" }),
    ];
    const once = rankParticipants(rows).map((r) => r.display_name);
    expect(rankParticipants([...rows].reverse()).map((r) => r.display_name)).toEqual(once);
    expect(once).toEqual(["Adil", "Zoya"]);
  });

  it("puts the faster of two equal scores first", () => {
    const rows = [
      p({ display_name: "Slow", score: 100, finished_at: "2026-09-13T10:09:00Z" }),
      p({ display_name: "Fast", score: 100, finished_at: "2026-09-13T10:05:00Z" }),
    ];
    expect(rankParticipants(rows)[0].display_name).toBe("Fast");
  });

  it("treats a finished player with no score as nothing rather than throwing", () => {
    const rows = [
      p({ display_name: "Null", score: null, finished_at: "2026-09-13T10:05:00Z" }),
      p({ display_name: "Some", score: 5, finished_at: "2026-09-13T10:05:00Z" }),
    ];
    expect(rankParticipants(rows)[0].display_name).toBe("Some");
  });

  it("copes with an empty room", () => {
    expect(rankParticipants([])).toEqual([]);
  });

  it("does not mutate what it was given", () => {
    const rows = [p({ display_name: "B", score: 1, finished_at: "z" }), p({ display_name: "A", score: 2, finished_at: "z" })];
    const before = rows.map((r) => r.display_name);
    rankParticipants(rows);
    expect(rows.map((r) => r.display_name)).toEqual(before);
  });
});

describe("sessionProgress", () => {
  it("counts the room", () => {
    const rows = [
      p({ display_name: "A", score: 100, finished_at: "z" }),
      p({ display_name: "B", score: 50, finished_at: "z" }),
      p({ display_name: "C" }),
    ];
    expect(sessionProgress(rows)).toEqual({
      joined: 3, finished: 2, stillPlaying: 1, averageScore: 75,
    });
  });

  it("reports no average before anybody has finished", () => {
    expect(sessionProgress([p({ display_name: "A" })]).averageScore).toBeNull();
  });

  it("copes with an empty room", () => {
    expect(sessionProgress([])).toEqual({ joined: 0, finished: 0, stillPlaying: 0, averageScore: null });
  });
});

describe("newSeed", () => {
  it("does not repeat", () => {
    const seeds = new Set(Array.from({ length: 200 }, () => newSeed()));
    expect(seeds.size).toBe(200);
  });

  // The code is read off a projector; the seed must not be derivable from it,
  // or a session could be played through before the host starts it.
  it("is not guessable from the code", () => {
    expect(newSeed(() => 0.5)).not.toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(newSeed().length).toBeGreaterThan(8);
  });
});
