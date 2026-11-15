import React from 'react';
import { Download, Printer } from 'lucide-react';
import { MopsState } from '../engine/mopsEngine';

interface PrinterLogPanelProps {
  state: MopsState;
}

export const PrinterLogPanel: React.FC<PrinterLogPanelProps> = ({ state }) => {
  const printerEnabled = state.L[20] === 0;

  const buildTranscriptText = (): string => {
    const header = [
      'MOPS — DEVICE 4 LINE-PRINTER & SESSION RECORD',
      `TEAM: ${state.teamName || 'UNNAMED'}`,
      `WEEK: ${state.week}`,
      '============================================',
      '',
    ];
    const logSection =
      state.printerLog.length > 0
        ? ['--- DEVICE 4 PRINT#4 OUTPUT ---', ...state.printerLog, '']
        : ['(No Device 4 PRINT#4 records logged yet.)', ''];

    const weeklySection =
      state.weeklyHistory.length > 0
        ? [
            '--- WEEKLY SUMMARY ---',
            'WK | DEMAND | MET | PROD | RAW_END | FGS_END | PROFIT',
            ...state.weeklyHistory.map(
              (r) =>
                `${String(r.week).padStart(2, ' ')} | ${String(r.demand).padStart(6, ' ')} | ${String(
                  r.satisfied
                ).padStart(3, ' ')} | ${String(r.production).padStart(4, ' ')} | ${String(
                  r.rawStockEnd
                ).padStart(7, ' ')} | ${String(r.goodsStockEnd).padStart(7, ' ')} | ${r.profit
                  .toFixed(2)
                  .padStart(8, ' ')}`
            ),
          ]
        : [];

    return [...header, ...logSection, ...weeklySection].join('\n');
  };

  const handleDownload = () => {
    const content = buildTranscriptText();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mops-${(state.teamName || 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#223036] bg-[#101619] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#e6edf0]">Device 4 Printer Output</h2>
            <p className="mt-1 text-xs text-[#8ca0a7]">
              {printerEnabled
                ? 'Printer mode is ON — calculation misses and final analysis log here.'
                : 'Printer mode is OFF — answer YES at session start to log calculation misses to Device 4.'}
            </p>
          </div>
          <div className="no-print flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#28373e] bg-[#151e22] px-3 py-2 text-xs font-medium text-[#e6edf0] transition-colors hover:border-emerald-400/50 hover:text-emerald-300 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export .TXT
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-[#08100d] transition-colors hover:bg-emerald-300 whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Print
            </button>
          </div>
        </div>

        <pre className="print-only-sheet mt-4 max-h-[420px] overflow-auto rounded-xl border border-[#1d292e] bg-[#080c0d] p-4 font-mono text-xs leading-relaxed text-[#d5e5df]">
          {buildTranscriptText()}
        </pre>
      </div>
    </div>
  );
};
