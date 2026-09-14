import { describe, expect, it } from "vitest";
import { sectionLabel, studentSectionLabel } from "./shell-nav";

describe("studentSectionLabel", () => {
  it("names every destination in the bar", () => {
    expect(studentSectionLabel("/dashboard")).toBe("Dashboard");
    expect(studentSectionLabel("/modes")).toBe("Modes");
    expect(studentSectionLabel("/class")).toBe("Class");
    expect(studentSectionLabel("/drugs")).toBe("Drug DB");
    expect(studentSectionLabel("/leaderboard")).toBe("Leaderboard");
    expect(studentSectionLabel("/profile")).toBe("Profile");
  });

  it("names the pages that are reached from the menu rather than the bar", () => {
    expect(studentSectionLabel("/settings")).toBe("Settings");
    expect(studentSectionLabel("/live")).toBe("Live session");
    expect(studentSectionLabel("/assessment/5f1c")).toBe("Assessment");
  });

  it("ignores a trailing slash and letter case", () => {
    expect(studentSectionLabel("/Modes/")).toBe("Modes");
  });

  it("says Menu for a page it has no name for", () => {
    expect(studentSectionLabel("/somewhere-else")).toBe("Menu");
  });
});

describe("sectionLabel", () => {
  const faculty = [
    { to: "/educator/dashboard", label: "Overview" },
    { to: "/educator/classes", label: "Classes" },
    { to: "/educator/class", label: "Class" },
  ];

  it("matches a nested page to its section", () => {
    expect(sectionLabel("/educator/classes/abc", faculty, "Faculty")).toBe("Classes");
  });

  // A prefix match on raw strings would have called /educator/classes "Class".
  it("matches whole path segments, not string prefixes", () => {
    expect(sectionLabel("/educator/classes", faculty, "Faculty")).toBe("Classes");
    expect(sectionLabel("/educator/class", faculty, "Faculty")).toBe("Class");
  });

  it("falls back to the name it is given", () => {
    expect(sectionLabel("/educator", faculty, "Faculty")).toBe("Faculty");
  });
});
