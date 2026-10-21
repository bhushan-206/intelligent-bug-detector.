import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  LabelList
} from 'recharts';
import { 
  Sparkles, 
  TrendingUp, 
  Info, 
  Compass, 
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  BarChart2,
  PieChart as PieIcon,
  Activity
} from 'lucide-react';
import { TableauDimension, TableauMeasure, TableauChartType, TableauPalette } from '../types';

export interface TableauDataPoint {
  name: string;
  value: number;
  count: number;
  avgConfidence: number;
  remediationMinutes: number;
  riskScore: number;
  healthScore: number;
  fixedRate?: number;
  timestamp?: string;
  [key: string]: any;
}

interface TableauInteractiveChartProps {
  data: TableauDataPoint[];
  selectedDimension: TableauDimension;
  selectedMeasure: TableauMeasure;
  chartType: TableauChartType;
  onSelectChartType?: (type: TableauChartType) => void;
  palette: TableauPalette;
  activeColors: string[];
  totalRecordsCount: number;
  onResetFilters?: () => void;
}

export const TableauInteractiveChart: React.FC<TableauInteractiveChartProps> = ({
  data = [],
  selectedDimension,
  selectedMeasure,
  chartType,
  onSelectChartType,
  palette,
  activeColors,
  totalRecordsCount,
  onResetFilters
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Measure formatting utilities
  const formatMeasureValue = (val: number, measure: TableauMeasure): string => {
    if (measure === 'avgConfidence') return `${val}%`;
    if (measure === 'remediationMinutes') return `${val} mins`;
    if (measure === 'healthScore') return `${val}/100`;
    if (measure === 'fixedRate') return `${val}%`;
    if (measure === 'healthImpact') return `${val} Risk`;
    return `${val}`;
  };

  const getMeasureLabel = (measure: TableauMeasure): string => {
    switch (measure) {
      case 'count': return 'SUM(Defects)';
      case 'avgConfidence': return 'AVG(Confidence %)';
      case 'remediationMinutes': return 'SUM(Remediation Mins)';
      case 'healthImpact': return 'AVG(Risk Index)';
      case 'healthScore': return 'AVG(Health Score)';
      case 'fixedRate': return '% Fixable Patch Rate';
      default: return 'Value';
    }
  };

  const getDimensionLabel = (dim: TableauDimension): string => {
    switch (dim) {
      case 'severity': return 'Severity Level';
      case 'type': return 'Defect Category';
      case 'language': return 'Programming Language';
      case 'source': return 'Detection Engine';
      case 'status': return 'Patch & Fix Status';
      case 'lineRange': return 'Code Line Range';
      case 'timeline': return 'Audit History Timeline';
      default: return 'Dimension';
    }
  };

  // Compute dataset analytical aggregations
  const { totalSum, meanValue, maxValue, maxItemName } = useMemo(() => {
    if (data.length === 0) return { totalSum: 0, meanValue: 0, maxValue: 0, maxItemName: 'None' };
    const sum = data.reduce((acc, d) => acc + (d.value || 0), 0);
    const mean = Math.round((sum / data.length) * 10) / 10;
    let max = -Infinity;
    let maxName = '';
    data.forEach(d => {
      if (d.value > max) {
        max = d.value;
        maxName = d.name;
      }
    });
    return {
      totalSum: sum,
      meanValue: mean,
      maxValue: max > 0 ? max : 0,
      maxItemName: maxName
    };
  }, [data]);

  // Recommended visualization rationale based on data archetype
  const aiRecommendation = useMemo(() => {
    if (selectedDimension === 'timeline') {
      return {
        type: 'area',
        label: 'Trend Evolution (Area/Line)',
        reason: 'Optimal for continuous time series & historical trajectory'
      };
    }
    if (selectedDimension === 'status' || selectedMeasure === 'fixedRate') {
      return {
        type: 'donut',
        label: 'Proportional Donut',
        reason: 'Best for part-to-whole ratio (Fixed vs Pending)'
      };
    }
    if (selectedDimension === 'type' || selectedDimension === 'source') {
      return {
        type: 'horizontal-bar',
        label: 'Ranked Comparison (H-Bar)',
        reason: 'Optimal for categorical labels and ranked distribution'
      };
    }
    if (selectedDimension === 'severity') {
      return {
        type: 'bar',
        label: 'Distribution Bars',
        reason: 'Clear comparative contrast across severity tiers'
      };
    }
    return {
      type: 'bar',
      label: 'Comparison Bar',
      reason: 'Standard discrete categorical comparison'
    };
  }, [selectedDimension, selectedMeasure]);

  // Dynamic Tableau AI Micro-Insight generator for tooltip and status
  const getMicroInsight = (d: TableauDataPoint): string => {
    const percent = totalSum > 0 ? Math.round((d.value / totalSum) * 100) : 0;
    const nameLower = d.name.toLowerCase();

    if (nameLower.includes('critical') || nameLower.includes('security')) {
      return `Critical risk vector: High exploitability impact. Recommended priority #1.`;
    }
    if (nameLower.includes('high') || nameLower.includes('runtime')) {
      return `High operational severity: Accounts for ${percent}% of identified defects.`;
    }
    if (nameLower.includes('fixed') || nameLower.includes('patch')) {
      return `1-click remediation ready: Zero manual code rewriting required.`;
    }
    if (nameLower.includes('scan') || selectedDimension === 'timeline') {
      return `Historical audit telemetry: Current quality rated at ${d.healthScore || 100}/100.`;
    }
    return `Represents ${percent}% of dataset volume with ${d.avgConfidence || 95}% detection confidence.`;
  };

  // Tableau AI Custom Tooltip
  const TableauCustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item: TableauDataPoint = payload[0].payload;
    const percent = totalSum > 0 ? Math.round((item.value / totalSum) * 100) : 0;
    const color = payload[0].color || payload[0].fill || activeColors[0];

    return (
      <div className="rounded-2xl border border-slate-700/80 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl max-w-xs text-xs space-y-3 z-50 animate-in fade-in-50 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
            <span className="font-bold text-white text-sm truncate max-w-[160px]">{item.name}</span>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {selectedDimension}
          </span>
        </div>

        {/* Primary Value */}
        <div className="flex items-baseline justify-between">
          <span className="text-slate-400 font-medium">{getMeasureLabel(selectedMeasure)}</span>
          <span className="text-base font-black text-white">
            {formatMeasureValue(item.value, selectedMeasure)}
          </span>
        </div>

        {/* Share of Total */}
        {totalSum > 0 && selectedMeasure === 'count' && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Proportion of Total</span>
              <span className="font-mono text-cyan-300 font-bold">{percent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, percent))}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )}

        {/* Analytical Attributes Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
          <div className="rounded-lg bg-slate-900/90 p-2 border border-slate-800">
            <div className="text-slate-400 text-[10px]">Confidence</div>
            <div className="font-bold text-emerald-400 mt-0.5">{item.avgConfidence}%</div>
          </div>
          <div className="rounded-lg bg-slate-900/90 p-2 border border-slate-800">
            <div className="text-slate-400 text-[10px]">Fix Effort</div>
            <div className="font-bold text-amber-300 mt-0.5">~{item.remediationMinutes}m</div>
          </div>
          <div className="rounded-lg bg-slate-900/90 p-2 border border-slate-800">
            <div className="text-slate-400 text-[10px]">Risk Factor</div>
            <div className={`font-bold mt-0.5 ${item.riskScore >= 7 ? 'text-rose-400' : item.riskScore >= 4 ? 'text-amber-400' : 'text-sky-400'}`}>
              {item.riskScore} / 10
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/90 p-2 border border-slate-800">
            <div className="text-slate-400 text-[10px]">Health Rating</div>
            <div className="font-bold text-cyan-300 mt-0.5">{item.healthScore}/100</div>
          </div>
        </div>

        {/* Tableau AI Micro-Insight */}
        <div className="rounded-xl bg-indigo-950/40 border border-indigo-500/30 p-2.5 text-[11px] text-indigo-200 flex items-start space-x-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-snug">{getMicroInsight(item)}</p>
        </div>
      </div>
    );
  };

  // =========================================================================
  // EMPTY DATASET STATE (FILTER OVER-RESTRICTION)
  // =========================================================================
  if (data.length === 0) {
    return (
      <div 
        id="tableau-chart-empty-state"
        className="lg:col-span-8 rounded-3xl border border-slate-800 bg-slate-950/90 p-8 sm:p-12 shadow-inner flex flex-col items-center justify-center text-center space-y-4 min-h-[420px]"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Compass className="h-7 w-7 animate-pulse" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h4 className="text-base font-bold text-white">No Telemetry Matches Active Filters</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            The current combination of language, severity, or engine filters produced 0 records from the {totalRecordsCount} available data points.
          </p>
        </div>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-orange-400 transition-all shadow-md active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Active Filters</span>
          </button>
        )}
      </div>
    );
  }

  // Calculate whether X-axis labels need to tilt
  const needsRotatedTicks = data.length > 5 || data.some(d => d.name.length > 10);

  return (
    <div 
      id="tableau-ai-interactive-chart-canvas"
      className="lg:col-span-8 rounded-3xl border border-slate-800 bg-slate-950/95 p-5 sm:p-6 shadow-2xl flex flex-col justify-between space-y-4 transition-all"
    >
      {/* Top Shelf Badges & AI Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-800/80 pb-3">
        <div className="space-y-1">
          {/* Tableau Desktop style Discrete & Continuous shelf pill headers */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="flex items-center space-x-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span>COLUMNS: [{getDimensionLabel(selectedDimension)}]</span>
            </span>
            <span className="text-slate-600 font-bold">×</span>
            <span className="flex items-center space-x-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>ROWS: [{getMeasureLabel(selectedMeasure)}]</span>
            </span>
          </div>

          {/* Tableau AI Dynamic Insight Subtitle */}
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="flex items-center space-x-1 text-amber-400 font-semibold">
              <Sparkles className="h-3 w-3" />
              <span>Tableau AI:</span>
            </span>
            <span>
              {aiRecommendation.reason} ({chartType.toUpperCase()} mark)
            </span>
          </div>
        </div>

        {/* Telemetry Summary Pill & Quick Mark Selector */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {onSelectChartType && (
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-slate-400">
              <button
                onClick={() => onSelectChartType('bar')}
                title="Tableau Bar Mark"
                className={`p-1.5 rounded-lg transition-colors ${chartType === 'bar' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:text-white'}`}
              >
                <BarChart2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onSelectChartType('donut')}
                title="Tableau Donut Mark"
                className={`p-1.5 rounded-lg transition-colors ${chartType === 'donut' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:text-white'}`}
              >
                <PieIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onSelectChartType('area')}
                title="Tableau Trend Area Mark"
                className={`p-1.5 rounded-lg transition-colors ${chartType === 'area' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:text-white'}`}
              >
                <Activity className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center space-x-1.5 rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-mono text-cyan-400 border border-slate-800">
            <span>{data.length} Buckets</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">Total: {totalSum}</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Stage */}
      <div className="h-[350px] w-full pt-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          {/* =============================================================
              1. VERTICAL BAR CHART (Tableau Discrete Comparison)
              ============================================================= */}
          {chartType === 'bar' ? (
            <BarChart 
              data={data} 
              margin={{ top: 25, right: 25, left: -10, bottom: needsRotatedTicks ? 30 : 10 }}
              onMouseMove={(state: any) => {
                if (state?.activeTooltipIndex !== undefined) {
                  setHoveredIndex(state.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                {data.map((_, idx) => {
                  const color = activeColors[idx % activeColors.length];
                  return (
                    <linearGradient key={`grad-${idx}`} id={`barGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={1} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false}
                interval={0}
                angle={needsRotatedTicks ? -25 : 0}
                textAnchor={needsRotatedTicks ? 'end' : 'middle'}
                height={needsRotatedTicks ? 45 : 30}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip content={<TableauCustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
              {meanValue > 0 && (
                <ReferenceLine 
                  y={meanValue} 
                  stroke="#94a3b8" 
                  strokeDasharray="4 4" 
                  label={{ value: `AVG: ${meanValue}`, fill: '#94a3b8', fontSize: 10, position: 'right' }} 
                />
              )}
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                <LabelList 
                  dataKey="value" 
                  position="top" 
                  fill="#94a3b8" 
                  fontSize={10} 
                  formatter={(val: any) => val > 0 ? val : ''} 
                />
                {data.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#barGrad-${index})`}
                    opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.4}
                    stroke={hoveredIndex === index ? '#ffffff' : 'transparent'}
                    strokeWidth={hoveredIndex === index ? 1.5 : 0}
                    className="transition-opacity duration-200"
                  />
                ))}
              </Bar>
            </BarChart>
          ) : 

          /* =============================================================
              2. HORIZONTAL BAR CHART (Tableau Categorical Ranked H-Bar)
              ============================================================= */
          chartType === 'horizontal-bar' ? (
            <BarChart 
              layout="vertical" 
              data={data} 
              margin={{ top: 15, right: 35, left: 35, bottom: 10 }}
              onMouseMove={(state: any) => {
                if (state?.activeTooltipIndex !== undefined) {
                  setHoveredIndex(state.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                {data.map((_, idx) => {
                  const color = activeColors[idx % activeColors.length];
                  return (
                    <linearGradient key={`hgrad-${idx}`} id={`hbarGrad-${idx}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={color} stopOpacity={1} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={80} />
              <Tooltip content={<TableauCustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
              {meanValue > 0 && (
                <ReferenceLine 
                  x={meanValue} 
                  stroke="#94a3b8" 
                  strokeDasharray="4 4" 
                  label={{ value: `AVG: ${meanValue}`, fill: '#94a3b8', fontSize: 10, position: 'top' }} 
                />
              )}
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={32}>
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  fill="#94a3b8" 
                  fontSize={10} 
                  formatter={(val: any) => val > 0 ? val : ''} 
                />
                {data.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#hbarGrad-${index})`}
                    opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.4}
                    stroke={hoveredIndex === index ? '#ffffff' : 'transparent'}
                    strokeWidth={hoveredIndex === index ? 1.5 : 0}
                    className="transition-opacity duration-200"
                  />
                ))}
              </Bar>
            </BarChart>
          ) : 

          /* =============================================================
              3. DONUT / PIE CHART (Tableau Proportional Composition)
              ============================================================= */
          chartType === 'donut' || chartType === 'pie' ? (
            <PieChart>
              <Tooltip content={<TableauCustomTooltip />} />
              <Legend 
                formatter={(val) => <span className="text-xs text-slate-300 font-medium">{val}</span>}
                iconType="circle"
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={chartType === 'donut' ? 70 : 0}
                outerRadius={110}
                paddingAngle={data.length > 1 ? 3 : 0}
                onMouseEnter={(_, idx) => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={activeColors[index % activeColors.length]}
                    opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.45}
                    stroke={hoveredIndex === index ? '#ffffff' : '#0f172a'}
                    strokeWidth={hoveredIndex === index ? 2 : 1}
                    className="transition-all duration-200 cursor-pointer"
                  />
                ))}
              </Pie>
              {/* Donut Center KPI Annotation */}
              {chartType === 'donut' && (
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle">
                  <tspan x="50%" dy="0" className="fill-white font-black text-2xl font-sans">
                    {totalSum}
                  </tspan>
                  <tspan x="50%" dy="18" className="fill-slate-400 font-mono text-[10px] uppercase">
                    Total Volume
                  </tspan>
                </text>
              )}
            </PieChart>
          ) : 

          /* =============================================================
              4. AREA CHART (Tableau Trend Area with Gradient)
              ============================================================= */
          chartType === 'area' ? (
            <AreaChart 
              data={data} 
              margin={{ top: 20, right: 30, left: -10, bottom: needsRotatedTicks ? 30 : 10 }}
            >
              <defs>
                <linearGradient id="tableauAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeColors[0]} stopOpacity={0.65} />
                  <stop offset="95%" stopColor={activeColors[0]} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false}
                angle={needsRotatedTicks ? -25 : 0}
                textAnchor={needsRotatedTicks ? 'end' : 'middle'}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip content={<TableauCustomTooltip />} />
              {meanValue > 0 && (
                <ReferenceLine 
                  y={meanValue} 
                  stroke="#94a3b8" 
                  strokeDasharray="4 4" 
                  label={{ value: `AVG: ${meanValue}`, fill: '#94a3b8', fontSize: 10, position: 'right' }} 
                />
              )}
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={activeColors[0]} 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#tableauAreaGrad)" 
                activeDot={{ r: 6, fill: '#ffffff', stroke: activeColors[0], strokeWidth: 3 }}
              />
            </AreaChart>
          ) : 

          /* =============================================================
              5. LINE CHART (Tableau Time-series Continuous Trend)
              ============================================================= */
          chartType === 'line' ? (
            <LineChart 
              data={data} 
              margin={{ top: 20, right: 30, left: -10, bottom: needsRotatedTicks ? 30 : 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false}
                angle={needsRotatedTicks ? -25 : 0}
                textAnchor={needsRotatedTicks ? 'end' : 'middle'}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip content={<TableauCustomTooltip />} />
              {meanValue > 0 && (
                <ReferenceLine 
                  y={meanValue} 
                  stroke="#94a3b8" 
                  strokeDasharray="4 4" 
                  label={{ value: `AVG: ${meanValue}`, fill: '#94a3b8', fontSize: 10, position: 'right' }} 
                />
              )}
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={activeColors[1] || activeColors[0]} 
                strokeWidth={3} 
                dot={{ r: 4, fill: activeColors[1] || activeColors[0] }} 
                activeDot={{ r: 7, fill: '#ffffff', stroke: activeColors[1] || activeColors[0], strokeWidth: 3 }}
              />
            </LineChart>
          ) : 

          /* =============================================================
              6. RADAR CHART (Tableau Polar Quality Assessment)
              ============================================================= */
          chartType === 'radar' ? (
            <RadarChart cx="50%" cy="50%" outerRadius={95} data={data}>
              <PolarGrid stroke="#334155" opacity={0.6} />
              <PolarAngleAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <PolarRadiusAxis stroke="#64748b" />
              <Radar 
                name={getMeasureLabel(selectedMeasure)} 
                dataKey="value" 
                stroke={activeColors[0]} 
                fill={activeColors[0]} 
                fillOpacity={0.45} 
              />
              <Tooltip content={<TableauCustomTooltip />} />
            </RadarChart>
          ) : 

          /* =============================================================
              7. SCATTER PLOT (Tableau Bivariate Measure Distribution)
              ============================================================= */
          chartType === 'scatter' ? (
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis type="number" dataKey="value" stroke="#94a3b8" fontSize={11} />
              <ZAxis range={[80, 500]} dataKey="count" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<TableauCustomTooltip />} />
              <Scatter name="Defect Point" data={data} fill={activeColors[0]}>
                {data.map((_, index) => (
                  <Cell key={`scatter-cell-${index}`} fill={activeColors[index % activeColors.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          ) : (

          /* =============================================================
              8. STACKED BAR (Tableau Multi-Measure Dual Stack)
              ============================================================= */
            <BarChart data={data} margin={{ top: 20, right: 30, left: -10, bottom: needsRotatedTicks ? 30 : 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false}
                angle={needsRotatedTicks ? -25 : 0}
                textAnchor={needsRotatedTicks ? 'end' : 'middle'}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip content={<TableauCustomTooltip />} />
              <Legend formatter={(val) => <span className="text-xs text-slate-300 font-medium">{val}</span>} />
              <Bar name={getMeasureLabel(selectedMeasure)} dataKey="value" fill={activeColors[0]} stackId="a" radius={[0, 0, 0, 0]} />
              <Bar name="Risk Factor Index" dataKey="riskScore" fill={activeColors[1] || '#f59e0b'} stackId="a" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Tableau Analytical Drilldown Bottom Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80 text-xs">
        <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium truncate">Peak Category</div>
          <div className="text-sm font-bold text-white mt-0.5 truncate">{maxItemName || 'N/A'}</div>
          <div className="text-[10px] text-amber-400 font-mono mt-0.5">Val: {maxValue}</div>
        </div>

        <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium truncate">Dataset Average</div>
          <div className="text-sm font-bold text-cyan-300 mt-0.5">{meanValue}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Across {data.length} buckets</div>
        </div>

        <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium truncate">Total Aggregated</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">{totalSum}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{getMeasureLabel(selectedMeasure)}</div>
        </div>

        <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium truncate">Tableau AI Palette</div>
          <div className="flex items-center space-x-1.5 mt-1.5">
            {activeColors.slice(0, 5).map((col, idx) => (
              <span key={idx} className="h-3 w-3 rounded-full border border-slate-950 shadow-sm" style={{ backgroundColor: col }} />
            ))}
            <span className="text-[10px] text-slate-400 font-mono capitalize ml-1">{palette}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
