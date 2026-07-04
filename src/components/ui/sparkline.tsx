import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

/**
 * Minimal SVG sparkline — draws a smooth area chart with gradient fill.
 * No axes, labels, or tooltips. Designed for inline use inside KPI cards.
 */
export function Sparkline({
  data,
  width = 80,
  height = 32,
  color = "#4f46e5",
  className,
}: SparklineProps) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return "";
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);
    const padding = 2;
    const chartHeight = height - padding * 2;

    const points = data.map((v, i) => ({
      x: i * step,
      y: padding + chartHeight - ((v - min) / range) * chartHeight,
    }));

    // Build smooth bezier path
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }

    // Close for area fill
    const areaD = `${d} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;
    return { line: d, area: areaD };
  }, [data, width, height]);

  if (!path || !data || data.length < 2) return null;

  const gradientId = `sparkline-grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${gradientId})`} />
      <path
        d={path.line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
