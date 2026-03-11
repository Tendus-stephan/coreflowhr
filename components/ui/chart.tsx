import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '../../utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<string, string>;
  };
};

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('useChart must be used within a ChartContainer');
  return context;
}

// ─── ChartStyle ───────────────────────────────────────────────────────────────
// Injects --color-{key} CSS variables scoped to the chart container

export const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorEntries = Object.entries(config).filter(([, v]) => v.color);
  if (!colorEntries.length) return null;
  const vars = colorEntries.map(([key, v]) => `  --color-${key}: ${v.color};`).join('\n');
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart="${id}"] {\n${vars}\n}`,
      }}
    />
  );
};

// ─── ChartContainer ───────────────────────────────────────────────────────────

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & { config: ChartConfig; children: React.ReactElement }
>(({ id, className, children, config, ...props }, ref) => {
  const uid = React.useId();
  const chartId = `chart-${id || uid.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          '[&_.recharts-cartesian-axis-tick_text]:fill-gray-400 [&_.recharts-cartesian-grid_line]:stroke-gray-100 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-gray-200 [&_.recharts-polar-grid_[stroke]]:stroke-gray-100 [&_.recharts-radial-bar-background-sector]:fill-gray-100 [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-gray-50 [&_.recharts-reference-line_[stroke]]:stroke-gray-200 [&_.recharts-sector[stroke]]:stroke-transparent [&_.recharts-surface]:overflow-visible',
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'ChartContainer';

// ─── ChartTooltip ─────────────────────────────────────────────────────────────

export const ChartTooltip = RechartsPrimitive.Tooltip;

export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<'div'> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: 'line' | 'dot' | 'dashed';
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) return null;
      const [item] = payload;
      const key = `${labelKey || item?.dataKey || item?.name || 'value'}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && typeof label === 'string'
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return (
          <div className={cn('font-medium text-gray-900', labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        );
      }
      if (!value) return null;
      return <div className={cn('font-medium text-gray-900', labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white border border-gray-100 rounded-lg shadow-lg px-3 py-2 text-xs',
          className
        )}
      >
        {tooltipLabel}
        <div className="grid gap-1.5 mt-1">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color || item.payload?.fill || item.color;

            if (formatter && item?.value !== undefined && item.name) {
              return (
                <div key={item.dataKey} className="flex items-center gap-2">
                  {!hideIndicator && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: indicatorColor }}
                    />
                  )}
                  {formatter(item.value, item.name, item, index, item.payload)}
                </div>
              );
            }

            return (
              <div key={item.dataKey} className="flex items-center gap-2 min-w-[6rem]">
                {!hideIndicator && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: indicatorColor }}
                  />
                )}
                <span className="text-gray-500 flex-1">{itemConfig?.label || item.name}</span>
                {item.value !== undefined && (
                  <span className="font-bold text-gray-900 ml-auto">
                    {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

// ─── ChartLegend ─────────────────────────────────────────────────────────────

export const ChartLegend = RechartsPrimitive.Legend;

export const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> &
    Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey }, ref) => {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div
      ref={ref}
      className={cn('flex items-center justify-center gap-4 text-xs', verticalAlign === 'top' ? 'pb-3' : 'pt-3', className)}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || 'value'}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        return (
          <div key={item.value} className="flex items-center gap-1.5 text-gray-500">
            {!hideIcon && (
              <span
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = 'ChartLegendContent';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const pl = payload as Record<string, unknown>;
  const configLabelKey =
    typeof pl?.dataKey === 'string' ? pl.dataKey : key;
  return config[configLabelKey] ?? config[key];
}
