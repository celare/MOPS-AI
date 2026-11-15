import React from 'react';
import {
  CompletedSessionSummary,
  MopsState,
  SHIFT_CAPS,
  SHIFT_COSTS,
  SHIFT_SHORT_NAMES,
} from '../engine/mopsEngine';

interface LedgerPanelProps {
  state: MopsState;
  pastSessions: CompletedSessionSummary[];
  onQuickCommand: (cmd: string) => void;
  onClearHistory: () => void;
}

export const LedgerPanel: React.FC<LedgerPanelProps> = ({
  state,
  pastSessions,
  onQuickCommand,
  onClearHistory,
}) => {
  const canCommand = state.phase === 'COMMAND';
  const isHoliday = state.week === 25 || state.week === 26;
  const plannedTotal = state.P[1] + state.P[2] + state.P[3] + state.P[4] + state.P[5];
  const rawStock = state.I[2];
  const goodsStock = state.G[2];
  const nextDelivery = state.week >= 13 && state.week <= 32 ? state.R[state.week + 1] : 0;
  const currentDemand = state.week >= 13 && state.week <= 32 ? state.S[state.week] : 0;

  const shifts: Array<{ key: string; idx: number }> = [
    { key: 'D', idx: 1 },
    { key: 'E', idx: 2 },
    { key: 'A', idx: 3 },
    { key: 'U', idx: 4 },
    { key: 'S', idx: 5 },
  ];

  const fmt = (n: number) =>
    n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Operational Snapshot */}
      <div className="rounded-2xl border border-[#223036] bg-[#101619] p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#e6edf0]">Current Position</h2>
          <span className="font-mono text-xs text-[#8ca0a7]">
            {state.deliveryCycle}-Week Delivery Cycle
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[#1d292e] bg-[#0b1012] p-3">
            <div className="text-xs text-[#8ca0a7]">Raw Material Stock</div>
            <div className="mt-1 font-mono text-xl font-semibold text-[#e6edf0] tabular-nums">
              {rawStock}
            </div>
          </div>
          <div className="rounded-xl border border-[#1d292e] bg-[#0b1012] p-3">
            <div className="text-xs text-[#8ca0a7]">Finished Goods</div>
            <div className="mt-1 font-mono text-xl font-semibold text-[#e6edf0] tabular-nums">
              {goodsStock}
            </div>
          </div>
          <div className="rounded-xl border border-[#1d292e] bg-[#0b1012] p-3">
            <div className="text-xs text-[#8ca0a7]">Next Wk Delivery</div>
            <div className="mt-1 font-mono text-xl font-semibold text-emerald-300 tabular-nums">
              {nextDelivery}
            </div>
          </div>
          <div className="rounded-xl border border-[#1d292e] bg-[#0b1012] p-3">
            <div className="text-xs text-[#8ca0a7]">
              {state.week >= 13 && state.week <= 32 ? `Wk ${state.week} Demand` : 'Wk 13 Demand'}
            </div>
            <div className="mt-1 font-mono text-xl font-semibold text-amber-300 tabular-nums">
              {currentDemand || 320}
            </div>
          </div>
        </div>
      </div>

      {/* Draft Production & Order Plan */}
      <div className="rounded-2xl border border-[#223036] bg-[#101619] p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#e6edf0]">
            {state.week >= 13 && state.week <= 32
              ? `Week ${state.week} Production Plan`
              : 'Draft Production Plan'}
          </h2>
          <span
            className={`font-mono text-xs tabular-nums ${
              plannedTotal > rawStock ? 'text-rose-400' : 'text-[#8ca0a7]'
            }`}
          >
            {plannedTotal} / {rawStock} raw units
          </span>
        </div>

        <div className="mt-3 divide-y divide-[#1b262a]">
          {shifts.map(({ key, idx }) => {
            const disabled = !canCommand || (isHoliday && idx !== 5);
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onQuickCommand(key)}
                className={`flex min-h-[44px] w-full items-center justify-between gap-3 py-2.5 text-left transition-colors ${
                  disabled
                    ? 'cursor-default opacity-60'
                    : 'hover:bg-[#151e22] rounded-lg px-2 -mx-2'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs font-semibold text-emerald-300 w-4">
                    {key}
                  </span>
                  <span className="text-sm text-[#dce7ea] truncate">
                    {SHIFT_SHORT_NAMES[idx]}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-mono text-xs tabular-nums">
                  <span className="text-[#7e949b]">
                    {idx === 1 ? '£1600 fixed' : `£${SHIFT_COSTS[idx].toFixed(2)}/u`}
                  </span>
                  <span className="w-20 text-right font-semibold text-[#e6edf0]">
                    {state.P[idx]} / {SHIFT_CAPS[idx]}
                  </span>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            disabled={!canCommand}
            onClick={() => onQuickCommand('R')}
            className={`flex min-h-[44px] w-full items-center justify-between gap-3 py-2.5 text-left transition-colors ${
              !canCommand
                ? 'cursor-default opacity-60'
                : 'hover:bg-[#151e22] rounded-lg px-2 -mx-2'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono text-xs font-semibold text-emerald-300 w-4">R</span>
              <span className="text-sm text-[#dce7ea] truncate">Raw Material Order</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 font-mono text-xs tabular-nums">
              <span className="text-[#7e949b]">£2.50/u + £30</span>
              <span className="w-20 text-right font-semibold text-[#e6edf0]">
                {state.rawOrder} / 3000
              </span>
            </div>
          </button>
        </div>

        {canCommand && (
          <button
            type="button"
            onClick={() => onQuickCommand('C')}
            className="mt-4 min-h-[44px] w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-[#08100d] transition-colors hover:bg-emerald-300"
          >
            Review &amp; Submit Plan (C)
          </button>
        )}
      </div>

      {/* Cumulative Financial Totals */}
      <div className="rounded-2xl border border-[#223036] bg-[#101619] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#e6edf0]">Cumulative Ledger</h2>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Sales Met / Demand</dt>
            <dd className="font-mono font-medium text-[#e6edf0] tabular-nums">
              {state.T[6]} / {state.T[5]} units
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Total Sales Revenue</dt>
            <dd className="font-mono font-medium text-[#e6edf0] tabular-nums">
              £{fmt(state.T[9])}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Cumulative Costs</dt>
            <dd className="font-mono font-medium text-[#e6edf0] tabular-nums">
              £{fmt(state.T[7])}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[#1d292e] pt-2">
            <dt className="font-medium text-[#dce7ea]">Cumulative Profit</dt>
            <dd
              className={`font-mono font-semibold tabular-nums ${
                state.T[10] >= 0 ? 'text-emerald-300' : 'text-rose-400'
              }`}
            >
              £{fmt(state.T[10])}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Cumulative Shortage Costs</dt>
            <dd className="font-mono font-medium text-amber-300 tabular-nums">
              £{fmt(state.T[8])}
            </dd>
          </div>
        </dl>
      </div>

      {/* Weekly History Table */}
      <div className="rounded-2xl border border-[#223036] bg-[#101619] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#e6edf0]">Weekly History</h2>
        {state.weeklyHistory.length === 0 ? (
          <p className="mt-2 text-xs text-[#7e949b]">
            Completed weeks will be recorded here automatically.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs tabular-nums">
              <thead>
                <tr className="border-b border-[#1d292e] text-[#7e949b]">
                  <th className="py-2 pr-3 font-medium">Wk</th>
                  <th className="py-2 pr-3 font-medium">Dem</th>
                  <th className="py-2 pr-3 font-medium">Met</th>
                  <th className="py-2 pr-3 font-medium">Prod</th>
                  <th className="py-2 pr-3 font-medium">Raw</th>
                  <th className="py-2 pr-3 font-medium">FGS</th>
                  <th className="py-2 text-right font-medium">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172125]">
                {state.weeklyHistory.map((row) => (
                  <tr key={row.week} className="text-[#dce7ea]">
                    <td className="py-2 pr-3 font-semibold text-emerald-300">{row.week}</td>
                    <td className="py-2 pr-3">{row.demand}</td>
                    <td className="py-2 pr-3">{row.satisfied}</td>
                    <td className="py-2 pr-3">{row.production}</td>
                    <td className="py-2 pr-3">{row.rawStockEnd}</td>
                    <td className="py-2 pr-3">{row.goodsStockEnd}</td>
                    <td
                      className={`py-2 text-right font-semibold ${
                        row.profit >= 0 ? 'text-emerald-300' : 'text-rose-400'
                      }`}
                    >
                      {row.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past Completed Sessions */}
      {pastSessions.length > 0 && (
        <div className="rounded-2xl border border-[#223036] bg-[#101619] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#e6edf0]">Saved Run Scorecards</h2>
            <button
              type="button"
              onClick={onClearHistory}
              className="text-xs font-medium text-[#7e949b] hover:text-rose-300"
            >
              Clear
            </button>
          </div>
          <div className="mt-3 divide-y divide-[#1b262a]">
            {pastSessions.map((run) => (
              <div key={run.id} className="py-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#e6edf0]">{run.teamName}</span>
                  <span className="font-mono text-[#8ca0a7]">
                    Wk {run.finalWeek} · Profit £{fmt(run.profit)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 font-mono text-[11px] text-[#7e949b]">
                  <span>Sales {run.salesMet}/{run.salesDemand}</span>
                  {run.profitFactor !== null && (
                    <span>Profit Factor {run.profitFactor.toFixed(2)}</span>
                  )}
                  <span>Survival {run.survivalFactor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
