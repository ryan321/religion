/**
 * The MDX component palette available inside lesson .mdx files.
 *
 * Author syntax (in any chapter .mdx):
 *   <KeyTerm>scarcity</KeyTerm>
 *   <Image src="./assets/cookie-jar.png" alt="A nearly-empty cookie jar" />
 *   <Video src="./assets/scarcity-intro.mp4" />
 *   <Callout kind="try">Try this with three cookies and three friends...</Callout>
 *
 * Asset URLs that start with "./" or are relative are rewritten by the
 * MDX renderer to point at /api/content/<bookSlug>/<path> so the Next.js
 * server can serve them from the authoring repo.
 */
import type { ReactNode } from "react";
import {
  Triangle,
  TAccount,
  RiskMatrix,
  SquareOfOpposition,
  FlowChart,
  EulerDiagram,
  Comparison,
  LabeledBox,
  BellCurve,
  SkewedCurve,
  UniformDistribution,
  BarChart,
  PieChart,
  LineGraph,
  Histogram,
  ScatterPlot,
} from "./diagrams";

export function KeyTerm({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-yellow-100 px-1 py-0.5 font-semibold text-yellow-900">
      {children}
    </span>
  );
}

export function Image({
  src,
  alt = "",
  caption,
}: {
  src: string;
  alt?: string;
  caption?: string;
}) {
  return (
    <figure className="my-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="mx-auto max-w-full rounded-lg border border-gray-200"
      />
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-600">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function Video({
  src,
  poster,
  caption,
}: {
  src: string;
  poster?: string;
  caption?: string;
}) {
  return (
    <figure className="my-4">
      <video
        src={src}
        poster={poster}
        controls
        className="mx-auto w-full max-w-full rounded-lg border border-gray-200"
      />
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-600">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

const CALLOUT_STYLES: Record<string, string> = {
  note: "border-blue-300 bg-blue-50 text-blue-950",
  try: "border-emerald-300 bg-emerald-50 text-emerald-950",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  example: "border-purple-300 bg-purple-50 text-purple-950",
};

const CALLOUT_LABELS: Record<string, string> = {
  note: "Note",
  try: "Try this",
  warning: "Watch out",
  example: "Example",
};

export function Callout({
  kind = "note",
  title,
  children,
}: {
  kind?: keyof typeof CALLOUT_STYLES;
  title?: string;
  children: ReactNode;
}) {
  const styles = CALLOUT_STYLES[kind] ?? CALLOUT_STYLES.note;
  const label = title ?? CALLOUT_LABELS[kind] ?? "Note";
  return (
    <aside className={`my-4 rounded-md border-l-4 px-4 py-3 ${styles}`}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </aside>
  );
}

export const lessonComponents = {
  KeyTerm,
  Image,
  Video,
  Callout,
  Triangle,
  TAccount,
  RiskMatrix,
  SquareOfOpposition,
  FlowChart,
  EulerDiagram,
  Comparison,
  LabeledBox,
  BellCurve,
  SkewedCurve,
  UniformDistribution,
  BarChart,
  PieChart,
  LineGraph,
  Histogram,
  ScatterPlot,
};
