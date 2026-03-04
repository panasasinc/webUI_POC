import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

export interface ChartSeries {
  dataKey: string;
  name: string;
  color: string;
}

interface PerformanceChartProps {
  title: string;
  data: Record<string, unknown>[];
  series: ChartSeries[];
  valueFormatter?: (value: number) => string;
  timeFormat?: Intl.DateTimeFormatOptions;
  yAxisUnit?: string;
}

const DEFAULT_TIME_FMT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

export function PerformanceChart({ title, data, series, valueFormatter, timeFormat, yAxisUnit }: PerformanceChartProps) {
  const defaultFormatter = (v: number) => String(Math.round(v));
  const fmt = timeFormat ?? DEFAULT_TIME_FMT;

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-vdura-amber">{title}</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.dataKey} id={`grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333338" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) => new Date(v).toLocaleTimeString([], fmt)}
              stroke="#555"
              tick={{ fill: '#888', fontSize: 10 }}
            />
            <YAxis
              stroke="#555"
              tick={{ fill: '#888', fontSize: 10 }}
              label={yAxisUnit ? { value: yAxisUnit, angle: -90, position: 'insideLeft', fill: '#888', fontSize: 10, dy: 20 } : undefined}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#2a2a2e', border: '1px solid #333338', borderRadius: 6 }}
              labelFormatter={(v) => new Date(v as string).toLocaleString()}
              formatter={(v: number) => (valueFormatter ?? defaultFormatter)(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {series.map((s) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                stroke={s.color}
                fill={`url(#grad-${s.dataKey})`}
                name={s.name}
                strokeWidth={1.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
