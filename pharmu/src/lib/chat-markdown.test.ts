import { describe, expect, it } from "vitest";
import { chatMarkdownToText, parseChatMarkdown, parseInlineMarkdown, type Block, type Span } from "./chat-markdown";

/**
 * The mentor's answers arrive as Markdown and used to be printed verbatim.
 *
 * Two things have to hold. Structure the model sent must survive - a list has
 * to stay a list and a label has to come out bold - and text the model did NOT
 * mean as formatting must survive untouched, because a pharmacy answer is full
 * of asterisks that are arithmetic and underscores that are part of a name.
 */

const text = (spans: Span[]) => spans.map((s) => s.text).join("");
const bold = (spans: Span[]) => spans.filter((s) => s.bold).map((s) => s.text);
/** Narrows to the blocks that carry spans directly, failing loudly otherwise. */
const spansOf = (block: Block): Span[] => {
  if (block.kind === "list") throw new Error("expected a paragraph or heading, got a list");
  return block.spans;
};

describe("parseInlineMarkdown", () => {
  it("makes a bold label bold and drops the markers", () => {
    const spans = parseInlineMarkdown("**Physical Strain:** Increased risk");
    expect(bold(spans)).toEqual(["Physical Strain:"]);
    expect(text(spans)).toBe("Physical Strain: Increased risk");
  });

  it("reads italic and inline code", () => {
    expect(parseInlineMarkdown("*gently*")).toEqual([{ text: "gently", italic: true }]);
    expect(parseInlineMarkdown("`500 mg`")).toEqual([{ text: "500 mg", code: true }]);
  });

  it("carries bold through into nested italic", () => {
    const spans = parseInlineMarkdown("**really *very* bad**");
    expect(spans.every((s) => s.bold)).toBe(true);
    expect(spans.find((s) => s.italic)?.text).toBe("very");
    expect(text(spans)).toBe("really very bad");
  });

  it("leaves arithmetic alone", () => {
    // A dose calculation is the likeliest thing in this app to contain loose
    // asterisks, and turning "5 * 3 * 2" into emphasis would eat the numbers.
    expect(text(parseInlineMarkdown("5 * 3 * 2 = 30"))).toBe("5 * 3 * 2 = 30");
    expect(parseInlineMarkdown("5 * 3 * 2 = 30").some((s) => s.italic)).toBe(false);
  });

  it("does not treat an underscore inside a word as emphasis", () => {
    expect(text(parseInlineMarkdown("drug_bookmarks and max_dose"))).toBe("drug_bookmarks and max_dose");
    expect(parseInlineMarkdown("drug_bookmarks and max_dose").some((s) => s.italic || s.bold)).toBe(false);
  });

  it("leaves an unpaired marker as the character it is", () => {
    expect(text(parseInlineMarkdown("a * b"))).toBe("a * b");
    expect(text(parseInlineMarkdown("**unclosed"))).toBe("**unclosed");
  });
});

describe("parseChatMarkdown", () => {
  it("turns a bulleted answer into a list, not one blob", () => {
    // Trimmed from the reply that prompted the fix: the markers were printed
    // and every newline collapsed, so all of this ran together as prose.
    const reply = [
      "From a clinical standpoint, potential disadvantages include:",
      "",
      "* **Physical Strain:** Increased risk of musculoskeletal injuries.",
      "* **Cardiovascular Demands:** Vigorous activity raises heart rate.",
    ].join("\n");

    const blocks = parseChatMarkdown(reply);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].kind).toBe("paragraph");

    const list = blocks[1];
    if (list.kind !== "list") throw new Error("expected a list");
    expect(list.ordered).toBe(false);
    expect(list.items).toHaveLength(2);
    expect(bold(list.items[0].spans)).toEqual(["Physical Strain:"]);
    expect(text(list.items[1].spans)).toBe("Cardiovascular Demands: Vigorous activity raises heart rate.");
  });

  it("keeps an ordered list ordered and separate from a bulleted one", () => {
    const blocks = parseChatMarkdown("1. First\n2. Second\n\n- Loose\n- Ends");
    expect(blocks.map((b) => b.kind)).toEqual(["list", "list"]);
    expect(blocks[0].kind === "list" && blocks[0].ordered).toBe(true);
    expect(blocks[1].kind === "list" && blocks[1].ordered).toBe(false);
  });

  it("reads an indented bullet as a nested one", () => {
    const blocks = parseChatMarkdown("* Parent\n  * Child");
    if (blocks[0].kind !== "list") throw new Error("expected a list");
    expect(blocks[0].items.map((i) => i.depth)).toEqual([0, 1]);
  });

  it("reads a heading", () => {
    const blocks = parseChatMarkdown("## Counseling points\n\nTake with food.");
    expect(blocks[0].kind).toBe("heading");
    expect(text(spansOf(blocks[0]))).toBe("Counseling points");
  });

  it("joins the lines of one paragraph but splits on a blank line", () => {
    const blocks = parseChatMarkdown("one\ntwo\n\nthree");
    expect(blocks).toHaveLength(2);
    expect(text(spansOf(blocks[0]))).toBe("one two");
    expect(text(spansOf(blocks[1]))).toBe("three");
  });

  it("does not mistake a rule or a bold line for a bullet", () => {
    // Both start with a marker character; neither has the space that makes it
    // a list item.
    expect(parseChatMarkdown("---")[0].kind).toBe("paragraph");
    const blocks = parseChatMarkdown("**Summary**");
    expect(blocks[0].kind).toBe("paragraph");
    expect(bold(spansOf(blocks[0]))).toEqual(["Summary"]);
  });

  it("survives an empty or whitespace-only reply", () => {
    expect(parseChatMarkdown("")).toEqual([]);
    expect(parseChatMarkdown("\n\n  \n")).toEqual([]);
  });

  it("never loses the words themselves", () => {
    // Whatever the parser decides about structure, no character of the
    // model's actual answer may go missing.
    const reply = "Take **500 mg** twice daily.\n\n* With food\n* Not with `warfarin`";
    const out = chatMarkdownToText(reply);
    for (const word of ["500 mg", "twice daily", "With food", "warfarin"]) {
      expect(out).toContain(word);
    }
  });
});
