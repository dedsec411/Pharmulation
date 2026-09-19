import { Fragment, type ReactNode } from "react";
import { parseChatMarkdown, type ListItem, type Span } from "@/lib/chat-markdown";

/**
 * A mentor reply, with the structure the model sent it in.
 *
 * Everything is built as React elements from parsed data, never as an HTML
 * string, so a reply cannot introduce markup no matter what comes back. See
 * `src/lib/chat-markdown.ts` for which subset of Markdown is understood.
 */
export function ChatMarkdown({ text }: { text: string }) {
  const blocks = parseChatMarkdown(text);

  // A reply with no structure at all still has to render, and the parser
  // returns nothing for an empty string.
  if (!blocks.length) return <>{text}</>;

  return (
    <div className="space-y-2 break-words">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <p key={index} className="font-bold text-foreground">
              <Spans spans={block.spans} />
            </p>
          );
        }

        if (block.kind === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List
              key={index}
              className={`space-y-1 pl-5 marker:text-primary/70 ${block.ordered ? "list-decimal" : "list-disc"}`}
            >
              {group(block.items).map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Spans spans={item.spans} />
                  {item.children.length > 0 && (
                    <ul className="mt-1 list-[circle] space-y-1 pl-5 marker:text-primary/60">
                      {item.children.map((child, childIndex) => (
                        <li key={childIndex}>
                          <Spans spans={child} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </List>
          );
        }

        return (
          <p key={index}>
            <Spans spans={block.spans} />
          </p>
        );
      })}
    </div>
  );
}

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, index) => {
        let node: ReactNode = span.text;
        if (span.code) {
          node = <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.92em]">{node}</code>;
        }
        if (span.italic) node = <em>{node}</em>;
        if (span.bold) node = <strong className="font-semibold text-foreground">{node}</strong>;
        return <Fragment key={index}>{node}</Fragment>;
      })}
    </>
  );
}

/** Hang each indented item under the item above it. */
function group(items: ListItem[]) {
  const grouped: { spans: Span[]; children: Span[][] }[] = [];
  for (const item of items) {
    const parent = grouped[grouped.length - 1];
    if (item.depth === 1 && parent) parent.children.push(item.spans);
    else grouped.push({ spans: item.spans, children: [] });
  }
  return grouped;
}
