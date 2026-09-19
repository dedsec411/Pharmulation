/**
 * The small slice of Markdown that Dr. Hakim actually replies in.
 *
 * The mentor is prompted for structured teaching answers, so Gemini returns
 * headings, bullet lists and `**bold**` labels. The chat bubble printed that
 * string verbatim, so a learner saw "* **Physical Strain:** ..." with the
 * markers intact, and every newline collapsed into a space because HTML
 * collapses whitespace - one unreadable block instead of a list.
 *
 * This parses to plain data and the component renders React elements from it,
 * so nothing ever reaches `dangerouslySetInnerHTML` and a model reply cannot
 * inject markup. It is deliberately a subset: headings, ordered and unordered
 * lists one level deep, bold, italic and inline code. Anything else is left as
 * the literal text it already was, which is no worse than today.
 */

export type Span = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

export type ListItem = { spans: Span[]; depth: 0 | 1 };

export type Block =
  | { kind: "paragraph"; spans: Span[] }
  | { kind: "heading"; spans: Span[] }
  | { kind: "list"; ordered: boolean; items: ListItem[] };

const HEADING = /^#{1,6}\s+(.*)$/;
const ORDERED = /^(\s*)\d+[.)]\s+(.*)$/;
// A marker needs whitespace after it, so "---" and "**bold**" are not bullets.
const BULLET = /^(\s*)[*+-]\s+(.*)$/;
const INLINE = /\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|\*([^*]+?)\*|`([^`]+?)`/g;

/** Emphasis never pads its content, so "5 * 3 * 2" stays arithmetic. */
function isEmphasis(content: string) {
  return content.length > 0 && content === content.trim();
}

export function parseInlineMarkdown(input: string, inherited: Omit<Span, "text"> = {}): Span[] {
  const spans: Span[] = [];
  const pushText = (text: string) => {
    if (text) spans.push({ ...inherited, text });
  };

  const pattern = new RegExp(INLINE.source, "g");
  let cursor = 0;
  let match: RegExpExecArray | null = pattern.exec(input);

  while (match) {
    const bold = match[1] ?? match[2];
    const italic = match[3];
    const code = match[4];
    const content = bold ?? italic ?? code ?? "";

    if (isEmphasis(content)) {
      pushText(input.slice(cursor, match.index));
      if (bold !== undefined) {
        spans.push(...parseInlineMarkdown(content, { ...inherited, bold: true }));
      } else if (italic !== undefined) {
        spans.push(...parseInlineMarkdown(content, { ...inherited, italic: true }));
      } else {
        // Code is literal by definition: never look for emphasis inside it.
        spans.push({ ...inherited, code: true, text: content });
      }
      cursor = match.index + match[0].length;
    }

    match = pattern.exec(input);
  }

  pushText(input.slice(cursor));
  return spans;
}

export function parseChatMarkdown(input: string): Block[] {
  const lines = String(input ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (!paragraph.length) return;
    // Markdown joins the lines of one paragraph with a space; only a blank
    // line starts a new one.
    blocks.push({ kind: "paragraph", spans: parseInlineMarkdown(paragraph.join(" ")) });
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      flush();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", spans: parseInlineMarkdown(heading[1]) });
      continue;
    }

    const ordered = ORDERED.exec(line);
    const bullet = ordered ? null : BULLET.exec(line);
    if (ordered || bullet) {
      flush();
      const indent = (ordered ? ordered[1] : bullet![1]).length;
      const body = ordered ? ordered[2] : bullet![2];
      const item: ListItem = { spans: parseInlineMarkdown(body), depth: indent >= 2 ? 1 : 0 };
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "list" && last.ordered === Boolean(ordered)) last.items.push(item);
      else blocks.push({ kind: "list", ordered: Boolean(ordered), items: [item] });
      continue;
    }

    paragraph.push(line.trim());
  }

  flush();
  return blocks;
}

/** The message with every marker removed, for a plain-text context. */
export function chatMarkdownToText(input: string): string {
  return parseChatMarkdown(input)
    .map((block) => {
      if (block.kind === "list") {
        return block.items.map((item) => item.spans.map((s) => s.text).join("")).join("\n");
      }
      return block.spans.map((s) => s.text).join("");
    })
    .join("\n");
}
