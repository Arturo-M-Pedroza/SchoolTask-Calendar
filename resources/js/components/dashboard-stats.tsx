import React, { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';

// Reads the `dark` class on <html> (set by use-appearance.ts) and stays
// in sync if the user switches theme or it changes via the system listener.
const useIsDark = () => {
    const [isDark, setIsDark] = useState(
        () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    );

    useEffect(() => {
        const root = document.documentElement;
        const observer = new MutationObserver(() => {
            setIsDark(root.classList.contains('dark'));
        });
        observer.observe(root, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return isDark;
};

type Segment = { value: number; color: string };

// Multi-segment donut. Segment lengths are proportional to `total` (not to
// the sum of segments) — so any leftover space (done tasks) naturally stays
// as plain unfilled track instead of needing its own color.
const Donut = ({ segments, total, size = 320, stroke = 22 }: { segments: Segment[]; total: number; size?: number; stroke?: number }) => {
    const isDark = useIsDark();
    const track = isDark ? '#1e293b' : '#e2e8f0'; // slate-800 (dark) / slate-200 (light)

    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let cumulative = 0;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <g transform={`rotate(-90 ${center} ${center})`}>
                {/* base track */}
                <circle cx={center} cy={center} r={radius} stroke={track} strokeWidth={stroke} fill="none" opacity="0.6" />

                {/* one arc per segment, stacked end-to-end */}
                {total > 0 && segments.map((seg, i) => {
                    if (seg.value <= 0) return null;

                    const fraction = seg.value / total;
                    const segLength = fraction * circumference;
                    const dashoffset = -((cumulative / total) * circumference);
                    cumulative += seg.value;

                    return (
                        <circle
                            key={i}
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={seg.color}
                            strokeWidth={stroke}
                            strokeDasharray={`${segLength} ${circumference - segLength}`}
                            strokeDashoffset={dashoffset}
                            strokeLinecap="butt" // butt, not round — round caps would leave visible gaps between adjacent segments
                            fill="none"
                            style={{ filter: 'url(#glow)' }}
                        />
                    );
                })}
            </g>
        </svg>
    );
};

const StatRow = ({ color, label, value, pct }: any) => (
    <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-4">
            <span className="w-4 h-4 rounded-full" style={{ background: color }} />
            <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
        </div>
        <div className="text-lg font-bold text-slate-900 dark:text-white text-right">
            <div>{value}</div>
            {typeof pct === 'number' && <div className="text-xs text-slate-400 dark:text-slate-500">{pct}%</div>}
        </div>
    </div>
);

const DashboardStats = ({ taskData = {} }: any) => {
    const overdueCount = taskData?.atrasadas ?? 0;
    const pendingCount = taskData?.pendientes ?? 0;
    const semanaCount = taskData?.semana ?? 0;
    const laterCount = taskData?.posterior ?? 0;

    const derivedTotal = taskData?.total ?? 0;
    const derivedDone = taskData?.hechas ?? 0;

    const rows = [
        { label: 'Retraso', color: '#f97316', value: overdueCount, pct: derivedTotal > 0 ? Math.round((overdueCount / derivedTotal) * 100) : 0 },
        { label: 'Esta semana', color: '#eab308', value: semanaCount, pct: derivedTotal > 0 ? Math.round((semanaCount / derivedTotal) * 100) : 0 },
        { label: 'Posterior', color: '#3b82f6', value: laterCount, pct: derivedTotal > 0 ? Math.round((laterCount / derivedTotal) * 100) : 0 },
    ];

    const segments: Segment[] = rows.map(r => ({ value: r.value, color: r.color }));

    return (
        <div className="relative p-8 min-h-[360px] bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex gap-8 items-start">
                <div className="relative w-[320px] h-[320px] flex items-center justify-center -ml-6">
                    <Donut segments={segments} total={derivedTotal} size={320} stroke={22} />
                    <div className="absolute text-center">
                        <div className="text-base text-slate-500 dark:text-slate-400">Tareas hechas</div>
                        <div className="text-5xl font-extrabold mt-1 text-slate-900 dark:text-white">{derivedDone} / {derivedTotal}</div>
                    </div>
                </div>

                <div className="flex-1">
                    <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">Resumen</div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/30 p-6 grid gap-4">
                        {rows.map(r => (
                            <StatRow key={r.label} color={r.color} label={r.label} value={r.value} pct={r.pct} />
                        ))}
                    </div>
                    <div className="mt-6">
                        <Link href="/calendar" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 transition rounded-md text-sm font-semibold text-white">Ir al calendario</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardStats;