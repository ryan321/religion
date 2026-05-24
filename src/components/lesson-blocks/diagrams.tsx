/**
 * Simple diagram components for lesson .mdx files.
 *
 * All array-like props use pipe-delimited strings because MDX cannot
 * reliably parse JS array literals in JSX props.
 *
 * Usage in .mdx:
 *   <Triangle labels="Word | Concept | Thing" />
 *   <TAccount title="Cash" debits="$500 | $200" credits="$100" />
 *   <RiskMatrix />
 *   <SquareOfOpposition />
 *   <FlowChart steps="Transaction | Journal | Ledger | Trial Balance | Statements" />
 *   <EulerDiagram type="A" subject="Dogs" predicate="Animals" />
 *   <Comparison left="Stocks" right="Bonds" rows="Ownership ~ Lending | Higher risk ~ Lower risk" />
 *   <LabeledBox title="Title" items="Item 1 | Item 2 | Item 3" />
 */

/** Split a pipe-delimited string into trimmed, non-empty items. */
function split(s: string | undefined, sep = "|"): string[] {
  if (!s) return [];
  return s.split(sep).map((x) => x.trim()).filter(Boolean);
}

/* -- Triangle diagram (3 vertices) ---------------------------------------- */

export function Triangle({
  labels = "",
  title,
}: {
  labels?: string;
  title?: string;
}) {
  const parts = split(labels);
  const l0 = parts[0] ?? "";
  const l1 = parts[1] ?? "";
  const l2 = parts[2] ?? "";
  return (
    <figure className="my-6 flex flex-col items-center">
      {title && (
        <figcaption className="mb-2 text-sm font-semibold text-gray-700">
          {title}
        </figcaption>
      )}
      <svg viewBox="0 0 300 260" className="w-full max-w-xs" aria-label={`Triangle: ${l0}, ${l1}, ${l2}`}>
        <line x1="150" y1="30" x2="30" y2="230" stroke="#6B7280" strokeWidth="2" />
        <line x1="150" y1="30" x2="270" y2="230" stroke="#6B7280" strokeWidth="2" />
        <line x1="30" y1="230" x2="270" y2="230" stroke="#6B7280" strokeWidth="2" />
        <circle cx="150" cy="30" r="5" fill="#3B82F6" />
        <circle cx="30" cy="230" r="5" fill="#3B82F6" />
        <circle cx="270" cy="230" r="5" fill="#3B82F6" />
        <text x="150" y="18" textAnchor="middle" className="fill-gray-900 text-sm font-medium">{l0}</text>
        <text x="18" y="252" textAnchor="middle" className="fill-gray-900 text-sm font-medium">{l1}</text>
        <text x="282" y="252" textAnchor="middle" className="fill-gray-900 text-sm font-medium">{l2}</text>
      </svg>
    </figure>
  );
}

/* -- T-Account ------------------------------------------------------------ */

export function TAccount({
  title,
  debits = "",
  credits = "",
}: {
  title: string;
  debits?: string;
  credits?: string;
}) {
  const debitList = split(debits);
  const creditList = split(credits);
  const maxRows = Math.max(debitList.length, creditList.length, 1);
  return (
    <figure className="my-6 flex flex-col items-center">
      <div className="w-full max-w-sm rounded-lg border border-gray-300 bg-white overflow-hidden">
        <div className="bg-blue-50 border-b-2 border-gray-800 px-4 py-2 text-center text-sm font-bold text-gray-900">
          {title}
        </div>
        <div className="grid grid-cols-2 divide-x-2 divide-gray-800">
          <div className="px-3 py-2">
            <p className="mb-1 text-xs font-semibold text-gray-500 uppercase">Debit</p>
            {Array.from({ length: maxRows }).map((_, i) => (
              <p key={i} className="text-sm text-gray-800 py-0.5">{debitList[i] ?? ""}</p>
            ))}
          </div>
          <div className="px-3 py-2">
            <p className="mb-1 text-xs font-semibold text-gray-500 uppercase">Credit</p>
            {Array.from({ length: maxRows }).map((_, i) => (
              <p key={i} className="text-sm text-gray-800 py-0.5">{creditList[i] ?? ""}</p>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

/* -- Risk Matrix (2x2) ---------------------------------------------------- */

export function RiskMatrix({ title }: { title?: string }) {
  return (
    <figure className="my-6 flex flex-col items-center">
      {title && (
        <figcaption className="mb-2 text-sm font-semibold text-gray-700">{title}</figcaption>
      )}
      <div className="w-full max-w-sm">
        <div className="mb-1 text-center text-xs font-semibold text-gray-500 uppercase">Impact</div>
        <div className="flex">
          <div className="flex flex-col justify-center mr-2">
            <span className="text-xs font-semibold text-gray-500 uppercase [writing-mode:vertical-lr] rotate-180">Likelihood</span>
          </div>
          <div className="grid grid-cols-2 gap-0.5 flex-1">
            <div className="rounded-tl-lg bg-yellow-100 border border-yellow-300 p-3 text-center text-xs font-medium text-yellow-800">
              High likelihood<br />Low impact<br /><span className="text-[10px] text-yellow-600">Monitor</span>
            </div>
            <div className="rounded-tr-lg bg-red-100 border border-red-300 p-3 text-center text-xs font-medium text-red-800">
              High likelihood<br />High impact<br /><span className="text-[10px] text-red-600">Top priority</span>
            </div>
            <div className="rounded-bl-lg bg-green-100 border border-green-300 p-3 text-center text-xs font-medium text-green-800">
              Low likelihood<br />Low impact<br /><span className="text-[10px] text-green-600">Don't worry</span>
            </div>
            <div className="rounded-br-lg bg-orange-100 border border-orange-300 p-3 text-center text-xs font-medium text-orange-800">
              Low likelihood<br />High impact<br /><span className="text-[10px] text-orange-600">Have a plan</span>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

/* -- Square of Opposition ------------------------------------------------- */

export function SquareOfOpposition({ title }: { title?: string }) {
  return (
    <figure className="my-6 flex flex-col items-center">
      {title && (
        <figcaption className="mb-2 text-sm font-semibold text-gray-700">{title}</figcaption>
      )}
      <svg viewBox="0 0 340 300" className="w-full max-w-sm" aria-label="Square of Opposition">
        <line x1="40" y1="40" x2="300" y2="40" stroke="#6B7280" strokeWidth="2" />
        <line x1="40" y1="260" x2="300" y2="260" stroke="#6B7280" strokeWidth="2" />
        <line x1="40" y1="40" x2="40" y2="260" stroke="#6B7280" strokeWidth="2" />
        <line x1="300" y1="40" x2="300" y2="260" stroke="#6B7280" strokeWidth="2" />
        <line x1="40" y1="40" x2="300" y2="260" stroke="#EF4444" strokeWidth="2" strokeDasharray="6,4" />
        <line x1="300" y1="40" x2="40" y2="260" stroke="#EF4444" strokeWidth="2" strokeDasharray="6,4" />
        <text x="40" y="28" textAnchor="middle" className="fill-blue-700 text-sm font-bold">A</text>
        <text x="40" y="16" textAnchor="middle" className="fill-gray-500 text-[10px]">All S is P</text>
        <text x="300" y="28" textAnchor="middle" className="fill-blue-700 text-sm font-bold">E</text>
        <text x="300" y="16" textAnchor="middle" className="fill-gray-500 text-[10px]">No S is P</text>
        <text x="40" y="280" textAnchor="middle" className="fill-blue-700 text-sm font-bold">I</text>
        <text x="40" y="292" textAnchor="middle" className="fill-gray-500 text-[10px]">Some S is P</text>
        <text x="300" y="280" textAnchor="middle" className="fill-blue-700 text-sm font-bold">O</text>
        <text x="300" y="292" textAnchor="middle" className="fill-gray-500 text-[10px]">Some S is not P</text>
        <text x="170" y="32" textAnchor="middle" className="fill-gray-600 text-[10px]">Contraries</text>
        <text x="170" y="274" textAnchor="middle" className="fill-gray-600 text-[10px]">Subcontraries</text>
        <text x="18" y="150" textAnchor="middle" className="fill-gray-600 text-[10px]" transform="rotate(-90 18 150)">Subalternation</text>
        <text x="322" y="150" textAnchor="middle" className="fill-gray-600 text-[10px]" transform="rotate(90 322 150)">Subalternation</text>
        <text x="170" y="145" textAnchor="middle" className="fill-red-500 text-[10px] font-medium">Contradictories</text>
      </svg>
    </figure>
  );
}

/* -- Flow Chart (linear steps) -------------------------------------------- */

export function FlowChart({
  steps = "",
  title,
}: {
  steps?: string;
  title?: string;
}) {
  const stepList = split(steps);
  return (
    <figure className="my-6 flex flex-col items-center">
      {title && (
        <figcaption className="mb-3 text-sm font-semibold text-gray-700">{title}</figcaption>
      )}
      <div className="flex flex-col items-center gap-0">
        {stepList.map((step, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm font-medium text-blue-800 text-center min-w-[10rem]">
              {step}
            </div>
            {i < stepList.length - 1 && (
              <div className="text-blue-300 text-lg leading-none py-0.5">&#8595;</div>
            )}
          </div>
        ))}
      </div>
    </figure>
  );
}

/* -- Euler Diagram (A, E, I, O) ------------------------------------------- */

export function EulerDiagram({
  type,
  subject,
  predicate,
}: {
  type: "A" | "E" | "I" | "O";
  subject: string;
  predicate: string;
}) {
  const configs = {
    A: { sx: 120, sy: 140, sr: 50, px: 150, py: 140, pr: 90, label: `All ${subject} is ${predicate}` },
    E: { sx: 90, sy: 140, sr: 60, px: 230, py: 140, pr: 60, label: `No ${subject} is ${predicate}` },
    I: { sx: 120, sy: 140, sr: 65, px: 200, py: 140, pr: 65, label: `Some ${subject} is ${predicate}` },
    O: { sx: 120, sy: 140, sr: 65, px: 200, py: 140, pr: 65, label: `Some ${subject} is not ${predicate}` },
  };
  const c = configs[type];
  return (
    <figure className="my-6 flex flex-col items-center">
      <svg viewBox="0 0 320 280" className="w-full max-w-xs" aria-label={c.label}>
        <circle cx={c.px} cy={c.py} r={c.pr} fill="none" stroke="#3B82F6" strokeWidth="2" />
        <text x={c.px} y={c.py - c.pr - 8} textAnchor="middle" className="fill-blue-600 text-xs font-medium">{predicate}</text>
        <circle cx={c.sx} cy={c.sy} r={c.sr} fill="none" stroke="#EF4444" strokeWidth="2" />
        <text x={c.sx} y={c.sy - c.sr - 8} textAnchor="middle" className="fill-red-600 text-xs font-medium">{subject}</text>
        <text x="160" y="270" textAnchor="middle" className="fill-gray-700 text-xs font-medium">{type}: {c.label}</text>
      </svg>
    </figure>
  );
}

/* -- Comparison Table ----------------------------------------------------- */

/** Rows use pipe to separate rows and tilde to separate columns.
 *  rows="Ownership ~ Lending | Higher risk ~ Lower risk" */
export function Comparison({
  left,
  right,
  rows = "",
  title,
}: {
  left: string;
  right: string;
  rows?: string;
  title?: string;
}) {
  const parsed = split(rows).map((row) => {
    const cols = row.split("~").map((c) => c.trim());
    return [cols[0] ?? "", cols[1] ?? ""] as [string, string];
  });
  return (
    <figure className="my-6 flex flex-col items-center">
      {title && (
        <figcaption className="mb-2 text-sm font-semibold text-gray-700">{title}</figcaption>
      )}
      <table className="w-full max-w-md border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-gray-300 bg-blue-50 px-3 py-2 text-left font-semibold text-blue-800">{left}</th>
            <th className="border border-gray-300 bg-orange-50 px-3 py-2 text-left font-semibold text-orange-800">{right}</th>
          </tr>
        </thead>
        <tbody>
          {parsed.map((row, i) => (
            <tr key={i}>
              <td className="border border-gray-300 px-3 py-2 text-gray-800">{row[0]}</td>
              <td className="border border-gray-300 px-3 py-2 text-gray-800">{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/* -- Distribution curves -------------------------------------------------- */

/** Bell curve (normal distribution) using computed Gaussian points. */
export function BellCurve({ title }: { title?: string }) {
  // Generate actual Gaussian curve points
  const cx = 200, baseline = 170, peakY = 40, sd = 65;
  const points: string[] = [];
  for (let x = 30; x <= 370; x += 2) {
    const z = (x - cx) / sd;
    const y = baseline - (baseline - peakY) * Math.exp(-0.5 * z * z);
    points.push(`${x},${y.toFixed(1)}`);
  }
  const curvePath = "M " + points.join(" L ");
  const fillPath = curvePath + ` L 370,${baseline} L 30,${baseline} Z`;

  return (
    <figure className="my-6 flex flex-col items-center">
      {title && (
        <figcaption className="mb-2 text-sm font-semibold text-gray-700">{title}</figcaption>
      )}
      <svg viewBox="0 0 400 200" className="w-full max-w-md" aria-label="Bell curve / normal distribution">
        <path d={fillPath} fill="#DBEAFE" stroke="none" />
        <path d={curvePath} fill="none" stroke="#3B82F6" strokeWidth="2.5" />
        <line x1="30" y1="170" x2="370" y2="170" stroke="#9CA3AF" strokeWidth="1" />
        <line x1="200" y1={String(peakY)} x2="200" y2="170" stroke="#3B82F6" strokeWidth="1" strokeDasharray="4,3" />
        {/* SD markers */}
        <line x1="135" y1="165" x2="135" y2="175" stroke="#6B7280" strokeWidth="1" />
        <line x1="265" y1="165" x2="265" y2="175" stroke="#6B7280" strokeWidth="1" />
        <line x1="70" y1="165" x2="70" y2="175" stroke="#6B7280" strokeWidth="1" />
        <line x1="330" y1="165" x2="330" y2="175" stroke="#6B7280" strokeWidth="1" />
        {/* Labels */}
        <text x="200" y="190" textAnchor="middle" className="fill-blue-600 text-[11px] font-semibold">Mean</text>
        <text x="135" y="190" textAnchor="middle" className="fill-gray-500 text-[10px]">-1 SD</text>
        <text x="265" y="190" textAnchor="middle" className="fill-gray-500 text-[10px]">+1 SD</text>
        <text x="70" y="190" textAnchor="middle" className="fill-gray-500 text-[10px]">-2 SD</text>
        <text x="330" y="190" textAnchor="middle" className="fill-gray-500 text-[10px]">+2 SD</text>
        {/* Percentage labels */}
        <text x="200" y="115" textAnchor="middle" className="fill-blue-700 text-[11px] font-medium">68%</text>
        <text x="200" y="140" textAnchor="middle" className="fill-blue-500 text-[9px]">95%</text>
      </svg>
    </figure>
  );
}

/** Skewed distribution. type="right" or type="left" */
export function SkewedCurve({ type = "right", title }: { type?: "right" | "left"; title?: string }) {
  const isRight = type === "right";
  return (
    <figure className="my-6 flex flex-col items-center">
      {title && (
        <figcaption className="mb-2 text-sm font-semibold text-gray-700">{title}</figcaption>
      )}
      <svg viewBox="0 0 400 180" className="w-full max-w-md" aria-label={`${type}-skewed distribution`}>
        <path
          d={isRight
            ? "M 40,160 C 50,158 70,140 90,80 C 100,50 110,30 120,25 C 130,30 160,70 200,110 C 240,140 300,155 360,160 L 40,160 Z"
            : "M 40,160 C 100,155 160,140 200,110 C 240,70 270,30 280,25 C 290,30 300,50 310,80 C 330,140 350,158 360,160 L 40,160 Z"
          }
          fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2.5"
        />
        <line x1="30" y1="160" x2="370" y2="160" stroke="#9CA3AF" strokeWidth="1" />
        <text x="200" y="178" textAnchor="middle" className="fill-gray-600 text-[10px]">
          {isRight ? "Right-skewed (tail stretches right)" : "Left-skewed (tail stretches left)"}
        </text>
      </svg>
    </figure>
  );
}

/** Uniform distribution (flat rectangle) */
export function UniformDistribution({ title }: { title?: string }) {
  return (
    <figure className="my-6 flex flex-col items-center">
      {title && (
        <figcaption className="mb-2 text-sm font-semibold text-gray-700">{title}</figcaption>
      )}
      <svg viewBox="0 0 400 160" className="w-full max-w-md" aria-label="Uniform distribution">
        <rect x="60" y="30" width="280" height="110" fill="#D1FAE5" stroke="#10B981" strokeWidth="2.5" rx="2" />
        <line x1="30" y1="140" x2="370" y2="140" stroke="#9CA3AF" strokeWidth="1" />
        <text x="200" y="90" textAnchor="middle" className="fill-emerald-700 text-[11px] font-medium">Equal probability for every outcome</text>
        <text x="200" y="155" textAnchor="middle" className="fill-gray-600 text-[10px]">Uniform - every outcome equally likely</text>
      </svg>
    </figure>
  );
}

/* -- Bar Chart ------------------------------------------------------------ */

/** Simple bar chart. data is pipe-delimited "Label:Value" pairs.
 *  <BarChart data="Red:7 | Blue:12 | Green:5 | Yellow:3" title="Favorite Colors" /> */
export function BarChart({
  data = "",
  title,
}: {
  data?: string;
  title?: string;
}) {
  const bars = split(data).map((item) => {
    const [label, val] = item.split(":").map((s) => s.trim());
    return { label: label ?? "", value: Number(val) || 0 };
  });
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const barWidth = 40;
  const gap = 20;
  const chartWidth = bars.length * (barWidth + gap) + gap;
  const chartHeight = 140;
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

  return (
    <figure className="my-6 flex flex-col items-center">
      {title && <figcaption className="mb-2 text-sm font-semibold text-gray-700">{title}</figcaption>}
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className="w-full max-w-md" aria-label={title ?? "Bar chart"}>
        <line x1={gap} y1={chartHeight} x2={chartWidth - gap / 2} y2={chartHeight} stroke="#9CA3AF" strokeWidth="1" />
        {bars.map((bar, i) => {
          const x = gap + i * (barWidth + gap);
          const barHeight = (bar.value / maxVal) * (chartHeight - 20);
          const y = chartHeight - barHeight;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill={colors[i % colors.length]} rx="3" />
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="fill-gray-700 text-[10px] font-medium">{bar.value}</text>
              <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" className="fill-gray-600 text-[9px]">{bar.label}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/* -- Pie Chart ------------------------------------------------------------ */

/** Simple pie chart. data is pipe-delimited "Label:Value" pairs.
 *  <PieChart data="Yes:60 | No:25 | Maybe:15" title="Survey Results" /> */
export function PieChart({
  data = "",
  title,
}: {
  data?: string;
  title?: string;
}) {
  const slices = split(data).map((item) => {
    const [label, val] = item.split(":").map((s) => s.trim());
    return { label: label ?? "", value: Number(val) || 0 };
  });
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];
  const cx = 120, cy = 120, r = 100;
  let angle = -Math.PI / 2;

  return (
    <figure className="my-6 flex flex-col items-center">
      {title && <figcaption className="mb-2 text-sm font-semibold text-gray-700">{title}</figcaption>}
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 240 240" className="w-48 h-48" aria-label={title ?? "Pie chart"}>
          {slices.map((slice, i) => {
            const sliceAngle = (slice.value / total) * 2 * Math.PI;
            const startX = cx + r * Math.cos(angle);
            const startY = cy + r * Math.sin(angle);
            const endAngle = angle + sliceAngle;
            const endX = cx + r * Math.cos(endAngle);
            const endY = cy + r * Math.sin(endAngle);
            const largeArc = sliceAngle > Math.PI ? 1 : 0;
            const d = `M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`;
            angle = endAngle;
            return <path key={i} d={d} fill={colors[i % colors.length]} stroke="white" strokeWidth="2" />;
          })}
        </svg>
        <div className="flex flex-col gap-1">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
              <div className="w-3 h-3 rounded-sm" style={{ background: colors[i % colors.length] }} />
              {slice.label} ({Math.round((slice.value / total) * 100)}%)
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

/* -- Line Graph ----------------------------------------------------------- */

/** Simple line graph. data is pipe-delimited "Label:Value" pairs.
 *  <LineGraph data="Mon:20 | Tue:25 | Wed:22 | Thu:28 | Fri:30" title="Temperature This Week" /> */
export function LineGraph({
  data = "",
  title,
}: {
  data?: string;
  title?: string;
}) {
  const points = split(data).map((item) => {
    const [label, val] = item.split(":").map((s) => s.trim());
    return { label: label ?? "", value: Number(val) || 0 };
  });
  if (points.length === 0) return null;
  const maxVal = Math.max(...points.map((p) => p.value), 1);
  const minVal = Math.min(...points.map((p) => p.value), 0);
  const range = maxVal - minVal || 1;
  const padding = 40;
  const chartWidth = 360;
  const chartHeight = 140;
  const stepX = points.length > 1 ? (chartWidth - padding * 2) / (points.length - 1) : 0;

  const pathPoints = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = chartHeight - ((p.value - minVal) / range) * (chartHeight - 30) - 10;
    return { x, y };
  });
  const pathD = pathPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <figure className="my-6 flex flex-col items-center">
      {title && <figcaption className="mb-2 text-sm font-semibold text-gray-700">{title}</figcaption>}
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} className="w-full max-w-md" aria-label={title ?? "Line graph"}>
        <line x1={padding} y1={chartHeight} x2={chartWidth - padding} y2={chartHeight} stroke="#9CA3AF" strokeWidth="1" />
        <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinejoin="round" />
        {pathPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#3B82F6" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" className="fill-gray-700 text-[9px] font-medium">{points[i].value}</text>
            <text x={p.x} y={chartHeight + 14} textAnchor="middle" className="fill-gray-600 text-[9px]">{points[i].label}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

/* -- Histogram ------------------------------------------------------------ */

/** Simple histogram. data is pipe-delimited "RangeLabel:Count" pairs.
 *  <Histogram data="40-49:2 | 50-59:5 | 60-69:8 | 70-79:12 | 80-89:9 | 90-100:4" title="Test Scores" /> */
export function Histogram({
  data = "",
  title,
}: {
  data?: string;
  title?: string;
}) {
  const bins = split(data).map((item) => {
    const [label, val] = item.split(":").map((s) => s.trim());
    return { label: label ?? "", count: Number(val) || 0 };
  });
  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  const barWidth = 50;
  const chartWidth = bins.length * barWidth + 40;
  const chartHeight = 140;

  return (
    <figure className="my-6 flex flex-col items-center">
      {title && <figcaption className="mb-2 text-sm font-semibold text-gray-700">{title}</figcaption>}
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`} className="w-full max-w-md" aria-label={title ?? "Histogram"}>
        <line x1="20" y1={chartHeight} x2={chartWidth - 20} y2={chartHeight} stroke="#9CA3AF" strokeWidth="1" />
        {bins.map((bin, i) => {
          const x = 20 + i * barWidth;
          const barHeight = (bin.count / maxCount) * (chartHeight - 20);
          const y = chartHeight - barHeight;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth - 1} height={barHeight} fill="#8B5CF6" stroke="#7C3AED" strokeWidth="1" />
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="fill-gray-700 text-[9px] font-medium">{bin.count}</text>
              <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" className="fill-gray-600 text-[8px]">{bin.label}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/* -- Scatter Plot --------------------------------------------------------- */

/** Simple scatter plot. data is pipe-delimited "X:Y" pairs.
 *  <ScatterPlot data="2:3 | 4:5 | 6:7 | 3:4 | 5:8" xLabel="Study Hours" yLabel="Score" title="Study Time vs Score" /> */
export function ScatterPlot({
  data = "",
  title,
  xLabel = "",
  yLabel = "",
}: {
  data?: string;
  title?: string;
  xLabel?: string;
  yLabel?: string;
}) {
  const points = split(data).map((item) => {
    const [xStr, yStr] = item.split(":").map((s) => s.trim());
    return { x: Number(xStr) || 0, y: Number(yStr) || 0 };
  });
  if (points.length === 0) return null;
  const maxX = Math.max(...points.map((p) => p.x), 1);
  const maxY = Math.max(...points.map((p) => p.y), 1);
  const pad = 40;
  const w = 320;
  const h = 200;

  return (
    <figure className="my-6 flex flex-col items-center">
      {title && <figcaption className="mb-2 text-sm font-semibold text-gray-700">{title}</figcaption>}
      <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full max-w-md" aria-label={title ?? "Scatter plot"}>
        <line x1={pad} y1={h - pad + 10} x2={w - 20} y2={h - pad + 10} stroke="#9CA3AF" strokeWidth="1" />
        <line x1={pad} y1="10" x2={pad} y2={h - pad + 10} stroke="#9CA3AF" strokeWidth="1" />
        {xLabel && <text x={(w + pad) / 2} y={h + 5} textAnchor="middle" className="fill-gray-600 text-[10px]">{xLabel}</text>}
        {yLabel && <text x="12" y={(h - pad) / 2 + 10} textAnchor="middle" className="fill-gray-600 text-[10px]" transform={`rotate(-90 12 ${(h - pad) / 2 + 10})`}>{yLabel}</text>}
        {points.map((p, i) => {
          const px = pad + (p.x / maxX) * (w - pad - 30);
          const py = (h - pad + 10) - (p.y / maxY) * (h - pad - 10);
          return <circle key={i} cx={px} cy={py} r="5" fill="#3B82F6" opacity="0.7" />;
        })}
      </svg>
    </figure>
  );
}

/* -- Simple labeled box diagram ------------------------------------------- */

/** items is pipe-delimited: items="Item 1 | Item 2 | Item 3" */
export function LabeledBox({
  title,
  items = "",
}: {
  title: string;
  items?: string;
}) {
  const parsed = split(items);
  return (
    <figure className="my-6 flex flex-col items-center">
      <div className="w-full max-w-sm rounded-lg border-2 border-blue-300 bg-blue-50 overflow-hidden">
        <div className="bg-blue-100 border-b border-blue-300 px-4 py-2 text-center text-sm font-bold text-blue-900">
          {title}
        </div>
        <ul className="px-4 py-3 space-y-1">
          {parsed.map((item, i) => (
            <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">&#8226;</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
