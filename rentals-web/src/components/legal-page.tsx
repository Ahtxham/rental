import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { Container, Eyebrow } from "@/components/ui";

/**
 * The layout the Musafir Fleet privacy policy and terms share.
 *
 * Both are about a different product from the rest of this site: the fleet
 * and driver app InvoSquare publishes, whose store listings point here. They
 * borrow the look of `/policies` so they read as part of the same site, and
 * each opens by saying which product it covers, because a customer who came to
 * rent a car and lands on a page about drivers' shifts deserves to be told in
 * the first line that it is not about them.
 *
 * Content is data rather than JSX so the "On this page" list and the headings
 * come from one array and cannot drift apart.
 */

export type LegalBlock =
  | { kind: "text"; body: ReactNode }
  | { kind: "points"; items: ReactNode[] }
  /**
   * A list of things with a reason each, which the old policy set as a
   * three-column table. Stacked instead, because three columns of sentences
   * at phone width is a column of single words.
   */
  | {
      kind: "rows";
      metaLabel: string;
      rows: { name: ReactNode; body: ReactNode; meta: ReactNode }[];
    };

export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };

/** An inline link, styled the way the rest of the site styles one in prose. */
export const TextLink = (props: ComponentProps<typeof Link>) => (
  <Link className="font-semibold text-ink underline underline-offset-4" {...props} />
);

/** The bold opening of a point, for lists where each item is named. */
export const Lead = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-ink">{children}</strong>
);

/**
 * InvoSquare publishes Musafir Fleet, so questions about it go to InvoSquare
 * and not to the rental office whose number is in this site's footer.
 */
export const PUBLISHER_CONTACT: LegalBlock = {
  kind: "points",
  items: [
    <>
      <Lead>InvoSquare</Lead>, Lahore, Pakistan
    </>,
    <>
      Email:{" "}
      <a href="mailto:info@invosquare.com" className="font-semibold text-ink underline underline-offset-4">
        info@invosquare.com
      </a>
    </>,
    <>
      Phone:{" "}
      <a href="tel:+923037470835" className="font-semibold text-ink underline underline-offset-4">
        +92 303 7470835
      </a>
    </>,
  ],
};

const Block = ({ block }: { block: LegalBlock }) => {
  if (block.kind === "text") {
    return <p className="text-sm leading-relaxed text-ink-soft">{block.body}</p>;
  }

  if (block.kind === "points") {
    return (
      <ul className="space-y-3.5">
        {block.items.map((item, index) => (
          <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-action" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
      {block.rows.map((row, index) => (
        <li key={index} className="p-5">
          <p className="text-sm font-semibold text-ink">{row.name}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{row.body}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            <span className="font-semibold">{block.metaLabel}:</span> {row.meta}
          </p>
        </li>
      ))}
    </ul>
  );
};

export const LegalPage = ({
  title,
  intro,
  effective,
  summary,
  sections,
}: {
  title: string;
  /** Says which product the page covers. Always the first thing under the title. */
  intro: ReactNode;
  effective: string;
  summary?: ReactNode;
  sections: LegalSection[];
}) => (
  <>
    <section className="border-b border-line bg-paper-deep">
      <Container className="py-14 sm:py-16">
        <Eyebrow>Musafir Fleet</Eyebrow>
        <h1 className="font-display mt-3 max-w-3xl text-4xl font-semibold sm:text-5xl">{title}</h1>
        <div className="mt-4 max-w-2xl space-y-3 text-base leading-relaxed text-ink-soft">{intro}</div>
        <p className="mt-4 text-sm text-muted">Effective {effective}.</p>
      </Container>
    </section>

    <Container className="py-14">
      <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label="On this page" className="h-fit lg:sticky lg:top-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            On this page
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-ink-soft transition-colors hover:text-ink">
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-2xl space-y-12">
          {summary ? (
            <div className="rounded-2xl border border-line bg-card p-6">
              <h2 className="font-display text-xl font-semibold">In short</h2>
              <div className="mt-2 text-sm leading-relaxed text-ink-soft">{summary}</div>
            </div>
          ) : null}

          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">{section.title}</h2>
              <div className="mt-4 space-y-4">
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Container>
  </>
);
