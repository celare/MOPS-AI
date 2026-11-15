import React from 'react';

export const ReferencePanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#223036] bg-[#101619] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#e6edf0]">Shift Capacities &amp; Rates</h2>
        <p className="mt-1 text-xs text-[#8ca0a7]">
          Initial conditions at Week 13: 550 raw material units, 200 finished goods, 800 units scheduled for delivery in Week 13.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs tabular-nums">
            <thead>
              <tr className="border-b border-[#1d292e] text-[#7e949b]">
                <th className="py-2 pr-3 font-medium">Key / Shift</th>
                <th className="py-2 pr-3 font-medium">Max Units</th>
                <th className="py-2 text-right font-medium">Cost Formula</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172125] text-[#dce7ea]">
              <tr>
                <td className="py-2 pr-3">D · Day Shift</td>
                <td className="py-2 pr-3">400</td>
                <td className="py-2 text-right">1,600 fixed</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">E · Evening</td>
                <td className="py-2 pr-3">60</td>
                <td className="py-2 text-right">4.30 / unit</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">A · Saturday</td>
                <td className="py-2 pr-3">40</td>
                <td className="py-2 text-right">4.40 / unit</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">U · Sunday</td>
                <td className="py-2 pr-3">60</td>
                <td className="py-2 text-right">5.00 / unit</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">S · Subcontract</td>
                <td className="py-2 pr-3">150</td>
                <td className="py-2 text-right">100 + 4.40 / unit</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-[#223036] bg-[#101619] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#e6edf0]">Material, Holding &amp; Revenue</h2>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Raw Material Order (R, 0–3000)</dt>
            <dd className="font-mono text-[#e6edf0] tabular-nums">30 per order</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Material Received Cost</dt>
            <dd className="font-mono text-[#e6edf0] tabular-nums">2.50 × received</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Raw Material Holding Cost</dt>
            <dd className="font-mono text-[#e6edf0] tabular-nums">0.02 × end stock</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Product Holding Cost</dt>
            <dd className="font-mono text-[#e6edf0] tabular-nums">0.04 × end stock</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Indirect Costs</dt>
            <dd className="font-mono text-[#e6edf0] tabular-nums">INT(600 + 1.05 × Met + 0.9)</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Sales Revenue</dt>
            <dd className="font-mono text-emerald-300 tabular-nums">13.50 × Demand Met</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Delivery Lead Time</dt>
            <dd className="font-mono text-[#e6edf0]">2 weeks (3 weeks on delay)</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Holiday Shutdown (Wks 25–26)</dt>
            <dd className="font-mono text-amber-300">600 fixed · Subcontract only</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#8ca0a7]">Strike Fixed Cost</dt>
            <dd className="font-mono text-rose-300">600 fixed · 100% factory lost</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-[#223036] bg-[#101619] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#e6edf0]">Penalty Schedules</h2>

        <h3 className="mt-3 text-xs font-medium text-[#9eb0b7]">
          Under-Production Penalty (Factory Output M8 = Total − Subcontract &lt; 396, waived Wks 25–26)
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-[#dce7ea]">
          <span>349 – 395 units:</span>
          <span className="text-right">(400 − M8) × 0.50</span>
          <span>299 – 348 units:</span>
          <span className="text-right">(400 − M8) × 1.00</span>
          <span>249 – 298 units:</span>
          <span className="text-right">(400 − M8) × 2.00</span>
          <span>Below 249 units:</span>
          <span className="text-right">(400 − M8) × 3.00</span>
        </div>

        <h3 className="mt-4 text-xs font-medium text-[#9eb0b7]">
          Customer Shortage Cost: INT(Units Short × Rate + 0.9) × 4.45
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[#8ca0a7]">
          Where <span className="font-mono text-[#dce7ea]">Units Short</span> (
          <span className="font-mono text-[#dce7ea]">F</span>) is unsatisfied demand (
          <span className="font-mono text-[#dce7ea]">Demand − Met</span>),{' '}
          <span className="font-mono text-[#dce7ea]">Rate</span> is taken from the tier below,{' '}
          <span className="font-mono text-[#dce7ea]">INT(… + 0.9)</span> rounds up, and{' '}
          <span className="font-mono text-[#dce7ea]">4.45</span> is unit margin. Tracked
          separately toward the final Survival Factor.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-[#dce7ea]">
          <span>1 – 10 short:</span>
          <span className="text-right">rate 0.50</span>
          <span>11 – 50 short:</span>
          <span className="text-right">rate 1.00</span>
          <span>51 – 100 short:</span>
          <span className="text-right">rate 1.50</span>
          <span>101 – 150 short:</span>
          <span className="text-right">rate 2.00</span>
          <span>151 – 200 short:</span>
          <span className="text-right">rate 3.00</span>
          <span>201 – 250 short:</span>
          <span className="text-right">rate 4.50</span>
          <span>251 – 300 short:</span>
          <span className="text-right">rate 6.00</span>
          <span>Over 300 short:</span>
          <span className="text-right">rate 8.00</span>
        </div>
      </div>
    </div>
  );
};
