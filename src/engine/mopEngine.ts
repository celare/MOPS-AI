export type MopPhase =
  | 'PRINTER_PROMPT'
  | 'TEAM_NAME'
  | 'COMMAND'
  | 'INPUT_RAW_ORDER'
  | 'INPUT_PRODUCTION'
  | 'CONFIRM_SUBMIT'
  | 'REPORT_WAIT_1'
  | 'REPORT_WAIT_2'
  | 'REPORT_WAIT_3'
  | 'REPORT_WAIT_4'
  | 'QUIZ_CHECK'
  | 'POST_QUIZ_WAIT'
  | 'FINAL_ANALYSIS'
  | 'GAME_OVER';

export type TerminalLineKind =
  | 'normal'
  | 'heading'
  | 'input'
  | 'success'
  | 'warning'
  | 'error'
  | 'muted'
  | 'divider';

export interface TerminalLine {
  id: number;
  kind: TerminalLineKind;
  text: string;
}

export interface QuizQuestion {
  prompt: string;
  expected: number;
  preLines?: string[];
}

export interface WeekRecord {
  week: number;
  demand: number;
  satisfied: number;
  shortage: number;
  production: number;
  subcontract: number;
  rawReceived: number;
  rawOrder: number;
  rawStockEnd: number;
  goodsStockEnd: number;
  totalCosts: number;
  salesRevenue: number;
  profit: number;
  shortageCost: number;
  productivityFactor: number;
  qualityLossFactor: number;
  strikeOccurred: boolean;
  supplyMessage: string;
}

export interface CompletedSessionSummary {
  id: string;
  teamName: string;
  endedAt: string;
  finalWeek: number;
  salesMet: number;
  salesDemand: number;
  profit: number;
  profitFactor: number | null;
  survivalFactor: string;
}

export interface MopState {
  phase: MopPhase;
  nextLineId: number;
  terminalLines: TerminalLine[];
  printerLog: string[];

  // BASIC variables & arrays
  teamName: string; // N$
  week: number; // W (starts 12 -> 13..32)
  deliveryCycle: number; // N (2 or 3)
  activeShift: number; // X (1..5)
  rawOrder: number; // R(2)
  prevRawOrder: number; // R(4)

  // Arrays (1-indexed alignment where applicable)
  S: number[]; // S(12..32) demand
  R: number[]; // R(1..36) deliveries & costs
  A: number[]; // A(1..33) loss factors & demand satisfied
  L: number[]; // L(1..21) flags & counters
  T: number[]; // T(1..33) totals & weekly revenues
  P: number[]; // P(1..5) shift production
  M: number[]; // M(1..8) shift caps & totals
  G: number[]; // G(1..4) finished goods stock & cost
  I: number[]; // I(1..3) raw material stock & cost
  C: number[]; // C(1..8) shift costs, C(7) prod cost, C(8) indirect cost
  E: number[]; // E(1..7) under-prod rates, E(7) penalty
  F_arr: number[]; // F(1..9) shortage rates, F(9) penalty

  // Week-level scalars
  P_factor: number; // P (productivity loss 0..1)
  Q_factor: number; // Q (quality loss 0..0.25)
  F_shortage: number; // F (customer shortage units)
  supplyAlterMsg: string; // S$(7)
  strikeMsgActive: boolean; // P$(3)
  strikeSecondMsgActive: boolean; // P$(4)

  // Quiz state (5000-5280, 8510-8600)
  quizQueue: QuizQuestion[];
  quizIndex: number;
  quizAttempts: number; // L(12)

  // Observational history for ledger UI
  weeklyHistory: WeekRecord[];
}

export const SHIFT_NAMES: Record<number, string> = {
  1: '     DAY',
  2: ' EVENING',
  3: 'SATURDAY',
  4: '  SUNDAY',
  5: 'SUBCONTR',
};

export const SHIFT_SHORT_NAMES: Record<number, string> = {
  1: 'Day Shift',
  2: 'Evening Shift',
  3: 'Saturday Shift',
  4: 'Sunday Shift',
  5: 'Subcontracting',
};

export const SHIFT_CAPS: Record<number, number> = {
  1: 400,
  2: 60,
  3: 40,
  4: 60,
  5: 150,
};

export const SHIFT_COSTS: Record<number, number> = {
  1: 4,
  2: 4.3,
  3: 4.4,
  4: 5,
  5: 4.4,
};

export const DEMAND_SCHEDULE: Record<number, number> = {
  13: 320,
  14: 420,
  15: 400,
  16: 380,
  17: 420,
  18: 380,
  19: 520,
  20: 500,
  21: 440,
  22: 400,
  23: 490,
  24: 500,
  25: 260,
  26: 530,
  27: 490,
  28: 540,
  29: 530,
  30: 325,
  31: 340,
  32: 530,
};

const S_MSG_1 = '50% RAW MATERIAL DELIVERY, THE REST      NEXT WEEK';
const S_MSG_2 = 'RAW MATERIALS DELAYED 1 WEEK';
const S_MSG_3 = '3 WEEK CYCLE FOR DELIVERY';
const S_MSG_5 = '2 WEEK CYCLE FOR DELIVERY';

function trunc2(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.floor(Math.abs(value) * 100 + 1e-9)) / 100;
}

function fmtMoney(value: number): string {
  const v = Math.round(value * 100) / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function pushLines(
  state: MopState,
  entries: Array<{ text: string; kind?: TerminalLineKind }>
): void {
  for (const entry of entries) {
    state.terminalLines.push({
      id: state.nextLineId++,
      kind: entry.kind ?? 'normal',
      text: entry.text,
    });
  }
}

function pushClsDivider(state: MopState, label?: string): void {
  if (state.terminalLines.length > 0) {
    state.terminalLines.push({
      id: state.nextLineId++,
      kind: 'divider',
      text: label ?? 'SCREEN CLEAR',
    });
  }
}

function appendHelpLines(state: MopState): void {
  pushClsDivider(state, 'HELP');
  pushLines(state, [
    { text: '    **** HELP ****', kind: 'heading' },
    { text: '' },
    { text: 'THE FOLLOWING LIST OF COMMAND KEYS' },
    { text: 'HAVE THE GIVEN MEANINGS. NO OTHER KEYS' },
    { text: 'WILL WORK.' },
    { text: '' },
    { text: 'H - DISPLAYS THE COMMAND KEYS' },
    { text: '' },
    { text: 'R - SIGNALS A RAW MATERIAL ORDER' },
    { text: '' },
    { text: 'D - SIGNALS PRODUCTION FOR DAY SHIFT' },
    { text: 'E - SIGNALS PRODUCTION FOR EVE. SHIFT' },
    { text: 'A - SIGNALS PRODUCTION FOR SAT. SHIFT' },
    { text: 'U - SIGNALS PRODUCTION FOR SUN. SHIFT' },
    { text: 'S - SIGNALS PRODUCTION FROM SUBCONTRACT' },
    { text: '' },
    { text: 'C - SIGNALS A PRODUCTION SUBMISSION' },
    { text: 'X - RESTARTS NEW GAME' },
    { text: 'Z - ENDS SESSION WITH FINAL ANALYSIS' },
  ]);
}

function promptCommand(state: MopState): void {
  state.phase = 'COMMAND';
  pushLines(state, [
    { text: '' },
    { text: `WEEK ${state.week} — COMMAND (OR PRESS H FOR HELP)`, kind: 'heading' },
  ]);
}

function initGameArrays(state: MopState, preservePrinterFlag: boolean): void {
  const printerFlag = preservePrinterFlag ? state.L[20] : 1;

  state.S = new Array(34).fill(0);
  for (let k = 13; k <= 32; k++) {
    state.S[k] = DEMAND_SCHEDULE[k];
  }
  state.S[12] = 340;

  state.R = new Array(37).fill(0);
  state.R[1] = 2.5;
  state.R[13] = 800;

  state.A = new Array(34).fill(0);
  state.A[1] = 0.2;
  state.A[2] = 0.1;
  state.A[3] = 1;
  state.A[4] = 0.3;
  state.A[5] = 0.05;
  state.A[12] = 340;

  state.L = new Array(22).fill(0);
  state.L[20] = printerFlag;

  state.T = new Array(34).fill(0);
  state.P = new Array(6).fill(0);

  state.M = [0, 400, 60, 40, 60, 150, 325, 325, 0];

  state.G = [0, 0.04, 200, 0, 0];
  state.I = [0, 0.02, 550, 0];
  state.C = [0, 4, 4.3, 4.4, 5, 4.4, 0, 0, 0];
  state.E = [0, 0.5, 1, 2, 3, 3.5, 0, 0];
  state.F_arr = [0, 0.5, 1, 1.5, 2, 3, 4.5, 6, 8, 0];

  state.deliveryCycle = 2;
  state.week = 12;
  state.rawOrder = 0;
  state.prevRawOrder = 0;
  state.activeShift = 1;
  state.P_factor = 0;
  state.Q_factor = 0;
  state.F_shortage = 0;
  state.supplyAlterMsg = '';
  state.strikeMsgActive = true;
  state.strikeSecondMsgActive = false;
  state.quizQueue = [];
  state.quizIndex = 0;
  state.quizAttempts = 0;
  state.weeklyHistory = [];
}

export function createInitialMopState(): MopState {
  const state: MopState = {
    phase: 'PRINTER_PROMPT',
    nextLineId: 1,
    terminalLines: [],
    printerLog: [],
    teamName: '',
    week: 12,
    deliveryCycle: 2,
    activeShift: 1,
    rawOrder: 0,
    prevRawOrder: 0,
    S: [],
    R: [],
    A: [],
    L: [],
    T: [],
    P: [],
    M: [],
    G: [],
    I: [],
    C: [],
    E: [],
    F_arr: [],
    P_factor: 0,
    Q_factor: 0,
    F_shortage: 0,
    supplyAlterMsg: '',
    strikeMsgActive: true,
    strikeSecondMsgActive: false,
    quizQueue: [],
    quizIndex: 0,
    quizAttempts: 0,
    weeklyHistory: [],
  };

  initGameArrays(state, false);

  pushLines(state, [
    { text: 'MOP — MANAGEMENT ORDERING & PROCESSING SYNTHESIS', kind: 'heading' },
    { text: 'COPYRIGHT (C) 1980 · THE POLYTECHNIC NEWCASTLE UPON TYNE', kind: 'muted' },
    { text: 'SPECIFICATION: B H CLAYBOURNE · PROGRAM: R REED', kind: 'muted' },
    { text: '' },
    { text: 'IS THE PRINTER ATTACHED AND SWITCHED ON ? (YES / NO)', kind: 'heading' },
  ]);

  return state;
}

function enterTeamNamePrompt(state: MopState): void {
  initGameArrays(state, true);
  state.phase = 'TEAM_NAME';
  pushClsDivider(state, 'NEW SESSION');
  pushLines(state, [
    { text: '     *** M O P ***', kind: 'heading' },
    { text: '' },
    { text: 'PRODUCTION TEAMS NAME ?', kind: 'heading' },
  ]);
}

function startNewWeek(state: MopState): void {
  state.week = state.week + 1;
  if (state.week > 32) {
    pushClsDivider(state, 'END OF GAME');
    pushLines(state, [{ text: 'END OF THIS GAME', kind: 'heading' }]);
    enterFinalAnalysis(state);
    return;
  }

  state.prevRawOrder = state.rawOrder;
  state.rawOrder = 0;
  state.E[7] = 0;
  state.C[7] = 0;
  state.R[3] = 0;
  state.I[3] = 0;
  state.G[3] = 0;
  state.F_arr[9] = 0;
  state.C[8] = 0;
  state.M[6] = 0;
  for (let k = 1; k <= 5; k++) {
    state.P[k] = 0;
  }

  state.supplyAlterMsg = '';

  if (state.week >= 16) {
    const bInt = Math.floor(100 * Math.random());
    if (bInt <= 7 && state.L[1] <= 1) {
      if (state.R[state.week] > 0) {
        state.supplyAlterMsg = S_MSG_1;
        state.L[1] = state.L[1] + 1;
      }
      state.R[state.week] = Math.round(state.R[state.week] * 0.5);
      state.R[state.week + 1] = state.R[state.week + 1] + Math.round(state.R[state.week]);
    } else if (bInt <= 17 && state.L[2] <= 1) {
      if (state.R[state.week] > 0) {
        state.supplyAlterMsg = S_MSG_2;
        state.L[2] = state.L[2] + 1;
      }
      state.R[state.week + 1] = state.R[state.week + 1] + state.R[state.week];
      state.R[state.week] = 0;
    }

    const bCycle = Math.random();
    if (bCycle <= 0.07 && state.L[3] <= 1) {
      state.L[3] = state.L[3] + 1;
      state.deliveryCycle = 3;
    }

    if (state.week > 25) {
      state.deliveryCycle = 2;
    }
  }

  if (state.week === 25 || state.week === 26) {
    pushLines(state, [
      { text: '' },
      { text: `NOTICE: WEEK ${state.week} IS A FACTORY HOLIDAY PERIOD.`, kind: 'warning' },
      { text: 'ONLY SUBCONTRACTING (S) IS PERMITTED FOR PRODUCTION.', kind: 'warning' },
    ]);
  }

  promptCommand(state);
}

function runWeekSimulation(state: MopState): void {
  const w = state.week;
  state.M[6] = state.P[1] + state.P[2] + state.P[3] + state.P[4] + state.P[5];

  // 3010-3070 Availability of subcontracting
  if (state.P[5] === 0) {
    state.L[13] = 0;
  } else if (state.L[13] === 1 && state.L[14] === 1) {
    state.L[13] = 0;
  } else if (state.L[13] === 1) {
    if (Math.random() < 0.4) {
      state.L[14] = 1;
      state.P[5] = 0;
    }
  } else {
    if (Math.random() < 0.4) {
      state.L[13] = 1;
      state.P[5] = 0;
    }
  }

  // 3135-3260 Production and quality control
  state.P_factor = 0;
  state.Q_factor = 0;

  if (w > 24 && w < 27) {
    // Holiday weeks 25-26: skip strikes/losses (3138 -> 3260)
  } else if (w < 14) {
    // Week 13: no random losses (3140 -> 3270)
  } else {
    const b = Math.random();
    if (b >= 0.5) {
      // 3243 Quality loss factors
      if (b <= 0.6 && state.L[5] < 4) {
        state.Q_factor = 0.25;
        state.L[5] += 1;
      } else if (b <= 0.7 && state.L[6] < 4) {
        state.Q_factor = 0.15;
        state.L[6] += 1;
      } else if (b <= 0.99 && state.L[7] < 4) {
        state.Q_factor = 0.05;
        state.L[7] += 1;
      }
    } else {
      // 3155 Strike conditions
      let strikeResolvedThisTurn = false;
      if (state.L[10] === 1 && state.L[17] === 1) {
        // Strike already happened and resolved previously
      } else if (state.L[10] === 1) {
        state.L[17] = 1;
        if (Math.random() < 0.5) {
          state.P_factor = state.A[3]; // 1 (2nd week of strike)
          strikeResolvedThisTurn = true;
        }
      } else if (b < 0.06) {
        state.P_factor = state.A[3]; // 1 (Strike starts)
        state.L[10] = 1;
        strikeResolvedThisTurn = true;
      }

      if (!strikeResolvedThisTurn && state.P_factor === 0) {
        // 3205 Production loss factors
        if (b <= 0.09 && state.L[8] < 4) {
          state.P_factor = state.A[1];
          state.L[8] += 1;
        } else if (b <= 0.24 && state.L[9] < 4) {
          state.P_factor = state.A[2];
          state.L[9] += 1;
        } else if (b <= 0.3 && state.L[11] < 4) {
          state.P_factor = state.A[4];
          state.L[11] += 1;
        } else if (b <= 0.49 && state.L[15] < 4) {
          state.P_factor = state.A[5];
          state.L[15] += 1;
        }
      }
    }
  }

  // Track L(10)=3 when strike finishes (consistent with 5085)
  if (state.L[10] === 1 && state.L[17] === 1 && state.P_factor !== 1) {
    state.L[10] = 3;
  }

  if (state.P_factor === 1) {
    state.Q_factor = 0;
  }

  // 3270 Make adjustments
  for (let k = 1; k <= 4; k++) {
    state.P[k] = Math.floor(state.P[k] * (1 - state.P_factor - state.Q_factor) + 1e-9);
  }
  state.M[7] = state.P[1] + state.P[2] + state.P[3] + state.P[4] + state.P[5];

  // 3290 Schedule raw material delivery
  state.R[w + state.deliveryCycle] = state.R[w + state.deliveryCycle] + state.rawOrder;

  // 3300-3320 Production costs C(7)
  if (state.P_factor === 1 || w === 25 || w === 26) {
    state.C[7] = 600;
    if (state.P[5] > 0) {
      state.C[7] = state.C[7] + state.P[5] * state.C[5] + 100;
    }
  } else {
    state.C[7] = 0;
    for (let k = 2; k <= 5; k++) {
      state.C[7] = state.C[7] + state.P[k] * state.C[k];
    }
    state.C[7] = state.C[7] + 1600;
    if (state.P[5] > 0) {
      state.C[7] = state.C[7] + 100;
    }
  }

  // 3330-3335 Raw material inventory update
  if (state.Q_factor > 0) {
    state.I[2] = state.I[2] + state.R[w] - state.M[6];
  } else {
    state.I[2] = state.I[2] + state.R[w] - state.M[7];
  }

  // 3340-3370 Finished goods & demand satisfaction
  state.G[4] = state.G[2];
  state.G[2] = state.G[2] + state.M[7];
  if (state.S[w] <= state.G[2]) {
    state.G[2] = state.G[2] - state.S[w];
    state.A[w] = state.S[w];
    state.F_shortage = 0;
  } else {
    state.A[w] = state.G[2];
    state.G[2] = 0;
    state.F_shortage = state.S[w] - state.A[w];
  }

  // 3375-3420 Shortage penalties F(9)
  if (state.F_shortage === 0) {
    state.F_arr[9] = 0;
  } else if (state.F_shortage < 11) {
    state.F_arr[9] = Math.floor(state.F_shortage * state.F_arr[1] + 0.9) * 4.45;
  } else {
    let matched = false;
    for (let k = 1; k <= 6; k++) {
      if (state.F_shortage <= k * 50) {
        state.F_arr[9] = Math.floor(state.F_shortage * state.F_arr[k + 1] + 0.9) * 4.45;
        matched = true;
        break;
      }
    }
    if (!matched) {
      state.F_arr[9] = Math.floor(state.F_shortage * state.F_arr[8] + 0.9) * 4.45;
    }
  }

  // 3450-3500 Under-production penalties E(7) (includes handwritten fix: skip for W=25 or 26)
  state.M[8] = state.M[7] - state.P[5];
  if (w === 25 || w === 26) {
    state.E[7] = 0;
  } else if (state.M[8] >= 396) {
    state.E[7] = 0;
  } else if (state.M[8] >= 349) {
    state.E[7] = (400 - state.M[8]) * state.E[1];
  } else if (state.M[8] >= 299) {
    state.E[7] = (400 - state.M[8]) * state.E[2];
  } else if (state.M[8] >= 249) {
    state.E[7] = (400 - state.M[8]) * state.E[3];
  } else {
    state.E[7] = (400 - state.M[8]) * state.E[4];
  }

  // 3510-3570 Calculation totals
  state.G[3] = state.G[2] * state.G[1];
  state.R[3] = state.R[w] * state.R[1];
  state.I[3] = state.I[2] * state.I[1];
  state.C[8] = Math.floor(600 + 1.05 * state.A[w] + 0.9);
  state.T[1] = state.C[7] + state.R[3] + state.I[3] + state.G[3] + state.C[8] + state.E[7];
  state.T[w] = state.A[w] * 13.5;
  if (state.rawOrder > 0) {
    state.T[1] = state.T[1] + 30;
  }
  state.T[5] = state.T[5] + state.S[w];
  state.T[6] = state.T[6] + state.A[w];
  state.T[7] = trunc2(state.T[7] + state.T[1]);
  state.T[8] = state.T[8] + state.F_arr[9];
  state.T[9] = state.T[9] + state.T[w];
  state.T[10] = trunc2(state.T[9] - state.T[7]);
  state.T[11] = state.T[11] + state.C[8];

  // Record observational history row
  state.weeklyHistory.push({
    week: w,
    demand: state.S[w],
    satisfied: state.A[w],
    shortage: state.F_shortage,
    production: state.M[7],
    subcontract: state.P[5],
    rawReceived: state.R[w],
    rawOrder: state.rawOrder,
    rawStockEnd: state.I[2],
    goodsStockEnd: state.G[2],
    totalCosts: trunc2(state.T[1]),
    salesRevenue: trunc2(state.T[w]),
    profit: trunc2(state.T[w] - state.T[1]),
    shortageCost: trunc2(state.F_arr[9]),
    productivityFactor: (1 - state.P_factor) * 100,
    qualityLossFactor: (1 - state.Q_factor) * 100,
    strikeOccurred: state.P_factor === 1,
    supplyMessage: state.supplyAlterMsg,
  });

  // 4015-4050 Weekly Report Screen 1
  pushClsDivider(state, `WEEK ${w} REPORT`);
  pushLines(state, [
    { text: `    WEEKLY REPORT   WEEK ${w}`, kind: 'heading' },
    { text: '' },
    { text: 'IN THE WEEK YOU HAVE JUST SUBMITTED' },
    { text: 'THE FOLLOWING OCCURRED' },
    { text: '' },
    { text: 'PRESS THE SPACE BAR TO CONTINUE', kind: 'muted' },
  ]);
  state.phase = 'REPORT_WAIT_1';
}

function advanceReport1(state: MopState): void {
  const lines: Array<{ text: string; kind?: TerminalLineKind }> = [];
  if (state.P_factor > 0) {
    lines.push({
      text: `PRODUCTIVITY FACTOR ${Math.round((1 - state.P_factor) * 100)}%`,
      kind: 'warning',
    });
  }
  if (state.Q_factor > 0) {
    lines.push({
      text: `QUALITY LOSS FACTOR ${Math.round((1 - state.Q_factor) * 100)}%`,
      kind: 'warning',
    });
  }
  if (state.P_factor === 1) {
    lines.push({ text: 'STRIKE:100% PROD. LOST', kind: 'error' });
  }
  lines.push({ text: 'PRODUCTION QUANTITIES:', kind: 'heading' });
  for (let k = 1; k <= 4; k++) {
    if (state.P[k] > 0) {
      lines.push({ text: `   ${SHIFT_NAMES[k]}   ${state.P[k]}` });
    }
  }
  if (state.L[13] === 1 && state.P[5] === 0) {
    lines.push({ text: 'SUBCONTRACTING FAILED TO DELIVER', kind: 'warning' });
  }
  if (state.P[5] > 0) {
    lines.push({ text: `   ${SHIFT_NAMES[5]}   ${state.P[5]}` });
  }
  lines.push({ text: '' });
  lines.push({ text: `TOTAL PRODUCTION               ${state.M[7]}` });
  lines.push({ text: `GOODS INVENTORY BEFORE DEMAND  ${state.G[4] + state.M[7]}` });
  lines.push({ text: '' });
  lines.push({ text: 'PRESS THE SPACE BAR TO CONTINUE', kind: 'muted' });

  pushLines(state, lines);
  state.phase = 'REPORT_WAIT_2';
}

function advanceReport2(state: MopState): void {
  const w = state.week;
  const lines: Array<{ text: string; kind?: TerminalLineKind }> = [
    { text: '' },
    { text: `RAW MATERIAL RECEIVED        ${state.R[w]}` },
    { text: state.deliveryCycle === 3 ? S_MSG_3 : S_MSG_5, kind: state.deliveryCycle === 3 ? 'warning' : 'normal' },
  ];
  if (state.supplyAlterMsg) {
    lines.push({ text: state.supplyAlterMsg, kind: 'warning' });
  }
  lines.push({ text: `SCHEDULED DELIVERY NEXT WEEK ${state.R[w + 1]}` });
  lines.push({ text: '' });
  lines.push({ text: 'PRESS THE SPACE BAR TO CONTINUE', kind: 'muted' });

  pushLines(state, lines);
  state.phase = 'REPORT_WAIT_3';
}

function advanceReport3(state: MopState): void {
  const w = state.week;
  const lines: Array<{ text: string; kind?: TerminalLineKind }> = [
    { text: '' },
    { text: `DEMAND QUANTITY WAS          ${state.S[w]}` },
    { text: `DEMAND SATISFIED WAS         ${state.A[w]}` },
    { text: `FINISHED GOODS STOCK         ${state.G[2]}` },
    { text: `RAW MATERIALS STOCK          ${state.I[2]}` },
  ];
  if (state.F_shortage > 0) {
    lines.push({
      text: `CUSTOMER SHORTAGES INCURRED WERE ${state.F_shortage}`,
      kind: 'warning',
    });
  }
  lines.push({ text: '' });
  lines.push({ text: 'RECORD THIS DATA', kind: 'heading' });
  lines.push({ text: '' });
  lines.push({ text: 'PRESS THE SPACE BAR TO CONTINUE', kind: 'muted' });

  pushLines(state, lines);
  state.phase = 'REPORT_WAIT_4';
}

function startQuizPhase(state: MopState): void {
  const w = state.week;
  const queue: QuizQuestion[] = [];
  let pendingPreLines: string[] = [];

  if (state.rawOrder > 0) {
    pendingPreLines.push('RAW MATERIAL ORDER COST    = 30');
  }
  if (state.R[w] > 0) {
    queue.push({
      prompt: 'MATERIAL RECEIVED COSTS    =',
      expected: trunc2(state.R[3]),
      preLines: pendingPreLines,
    });
    pendingPreLines = [];
  }
  if (state.I[2] > 0) {
    queue.push({
      prompt: 'RAW MATERIAL HOLDING COSTS =',
      expected: trunc2(state.I[3]),
      preLines: pendingPreLines,
    });
    pendingPreLines = [];
  }
  if (state.G[2] > 0) {
    queue.push({
      prompt: 'PRODUCT HOLDING COSTS      =',
      expected: trunc2(state.G[3]),
      preLines: pendingPreLines,
    });
    pendingPreLines = [];
  }
  if (state.F_shortage > 0) {
    queue.push({
      prompt: 'SHORTAGE COSTS             =',
      expected: trunc2(state.F_arr[9]),
      preLines: pendingPreLines,
    });
    pendingPreLines = [];
  }

  if (w === 25 || w === 26) {
    pendingPreLines.push('HOLIDAY SHUTDOWN COSTS     = 600');
  } else {
    if (state.P_factor !== 1) {
      pendingPreLines.push('DAY SHIFT COST             = 1600');
    }
    for (let k = 2; k <= 4; k++) {
      if (state.P[k] > 0) {
        queue.push({
          prompt: `${SHIFT_NAMES[k].trim()} SHIFT PROD COST =`,
          expected: trunc2(state.P[k] * state.C[k]),
          preLines: pendingPreLines,
        });
        pendingPreLines = [];
      }
    }
  }

  if (state.P[5] > 0) {
    queue.push({
      prompt: 'SUBCONTR PROD COST (ADD 100)=',
      expected: trunc2(state.P[5] * state.C[5] + 100),
      preLines: pendingPreLines,
    });
    pendingPreLines = [];
  }

  if (state.E[7] > 0) {
    queue.push({
      prompt: 'UNDER PRODUCTION PENALTY   =',
      expected: trunc2(state.E[7]),
      preLines: pendingPreLines,
    });
    pendingPreLines = [];
  }

  if (state.C[8] > 0) {
    queue.push({
      prompt: 'INDIRECT COSTS             =',
      expected: trunc2(state.C[8]),
      preLines: pendingPreLines,
    });
    pendingPreLines = [];
  }

  if (state.P_factor === 1) {
    pendingPreLines.push('STRIKE COSTS               = 600');
  }

  pendingPreLines.push('');
  pendingPreLines.push(`TOTAL COSTS                = ${fmtMoney(state.T[1])}`);
  pendingPreLines.push(`TOTAL CASH SALES           = ${fmtMoney(state.T[w])}`);

  queue.push({
    prompt: 'PROFIT                     =',
    expected: trunc2(state.T[w] - state.T[1]),
    preLines: pendingPreLines,
  });

  state.quizQueue = queue;
  state.quizIndex = 0;
  state.quizAttempts = 0;
  state.phase = 'QUIZ_CHECK';

  pushClsDivider(state, `WEEK ${w} CALCULATIONS`);
  pushLines(state, [
    { text: `   LAST WEEKS FIGURES (WEEK ${w})`, kind: 'heading' },
    { text: '' },
    { text: 'TYPE IN YOUR CALCULATIONS WHEN REQUESTED' },
    { text: '' },
  ]);

  emitCurrentQuizPrompt(state);
}

function emitCurrentQuizPrompt(state: MopState): void {
  const q = state.quizQueue[state.quizIndex];
  if (!q) return;

  if (q.preLines && q.preLines.length > 0 && state.quizAttempts === 0) {
    pushLines(
      state,
      q.preLines.map((line) => ({ text: line }))
    );
  }
  pushLines(state, [{ text: q.prompt, kind: 'heading' }]);
}

function finishQuizPhase(state: MopState): void {
  pushLines(state, [
    { text: '' },
    { text: `CUMULATIVE : COSTS         = ${fmtMoney(state.T[7])}` },
    { text: `             PROFITS       = ${fmtMoney(state.T[10])}` },
    { text: `             SHORTAGE      = ${fmtMoney(state.T[8])}` },
    { text: '' },
    { text: 'PRESS THE SPACE BAR TO CONTINUE', kind: 'muted' },
  ]);
  state.phase = 'POST_QUIZ_WAIT';
}

function enterFinalAnalysis(state: MopState): void {
  const w = state.week;
  const optProfit = Math.floor(state.T[6] + 0.9) * 4.45;
  const profitFactor =
    state.T[6] > 0 ? Math.floor((100 * state.T[10]) / (state.T[6] * 4.45)) / 100 : null;
  const survivalFactor =
    state.T[6] > 0
      ? state.T[8] > 0
        ? String(Math.floor((100 * (state.T[6] * 4.45)) / state.T[8]) / 100)
        : 'FANTASTIC'
      : 'N/A';

  const analysisLines = [
    `  CUMULATIVE ANALYSIS  WEEK ${w}`,
    `TEAM: ${state.teamName || 'UNNAMED'}`,
    'TOTAL :',
    `        SALES MET          ${state.T[6]}`,
    `        SALES DEMAND       ${state.T[5]}`,
    `CUSTOMER SHORTAGES         ${state.T[5] - state.T[6]}`,
    `CUMULATIVE PROD COSTS      ${fmtMoney(state.T[7])}`,
    `CUMULATIVE IND. COSTS      ${fmtMoney(state.T[11])}`,
    `TOTAL SALES REVENUE        ${fmtMoney(state.T[9])}`,
    `PROFIT                     ${fmtMoney(state.T[10])}`,
    `TOTAL SHORTAGE COSTS       ${fmtMoney(state.T[8])}`,
    `OPTIMUM PROFIT             ${fmtMoney(optProfit)}`,
  ];

  if (profitFactor !== null) {
    analysisLines.push(`PROFIT FACTOR              ${profitFactor.toFixed(2)}`);
    analysisLines.push(
      survivalFactor === 'FANTASTIC'
        ? 'SURVIVAL FACTOR---FANTASTIC'
        : `SURVIVAL FACTOR            ${survivalFactor}`
    );
  }

  pushClsDivider(state, 'FINAL ANALYSIS');
  pushLines(
    state,
    analysisLines.map((line, i) => ({
      text: line,
      kind: i === 0 ? 'heading' : 'normal',
    }))
  );
  pushLines(state, [
    { text: '' },
    { text: 'SESSION COMPLETE. PRESS SPACE OR TYPE X FOR A NEW GAME.', kind: 'muted' },
  ]);

  if (state.L[20] === 0 && w > 13) {
    state.printerLog.push('----------------------------------------');
    state.printerLog.push(...analysisLines);
    state.printerLog.push('----------------------------------------');
  }

  state.phase = 'GAME_OVER';
}

export function buildFinalSummary(state: MopState): CompletedSessionSummary | null {
  if (state.week <= 13 && state.weeklyHistory.length === 0) return null;
  const profitFactor =
    state.T[6] > 0 ? Math.floor((100 * state.T[10]) / (state.T[6] * 4.45)) / 100 : null;
  const survivalFactor =
    state.T[6] > 0
      ? state.T[8] > 0
        ? String(Math.floor((100 * (state.T[6] * 4.45)) / state.T[8]) / 100)
        : 'FANTASTIC'
      : 'N/A';
  return {
    id: `${Date.now()}`,
    teamName: state.teamName || 'Team',
    endedAt: new Date().toISOString(),
    finalWeek: Math.min(state.week, 32),
    salesMet: state.T[6],
    salesDemand: state.T[5],
    profit: trunc2(state.T[10]),
    profitFactor,
    survivalFactor,
  };
}

export function processMopInput(prev: MopState, rawInput: string): MopState {
  // Shallow-clone state & arrays cleanly for React immutability
  const state: MopState = {
    ...prev,
    terminalLines: [...prev.terminalLines],
    printerLog: [...prev.printerLog],
    S: [...prev.S],
    R: [...prev.R],
    A: [...prev.A],
    L: [...prev.L],
    T: [...prev.T],
    P: [...prev.P],
    M: [...prev.M],
    G: [...prev.G],
    I: [...prev.I],
    C: [...prev.C],
    E: [...prev.E],
    F_arr: [...prev.F_arr],
    quizQueue: [...prev.quizQueue],
    weeklyHistory: [...prev.weeklyHistory],
  };

  // Handle "PRESS THE SPACE BAR TO CONTINUE" waits
  if (
    state.phase === 'REPORT_WAIT_1' ||
    state.phase === 'REPORT_WAIT_2' ||
    state.phase === 'REPORT_WAIT_3' ||
    state.phase === 'REPORT_WAIT_4' ||
    state.phase === 'POST_QUIZ_WAIT'
  ) {
    if (state.phase === 'REPORT_WAIT_1') advanceReport1(state);
    else if (state.phase === 'REPORT_WAIT_2') advanceReport2(state);
    else if (state.phase === 'REPORT_WAIT_3') advanceReport3(state);
    else if (state.phase === 'REPORT_WAIT_4') startQuizPhase(state);
    else if (state.phase === 'POST_QUIZ_WAIT') startNewWeek(state);
    return state;
  }

  if (state.phase === 'GAME_OVER') {
    const trimmed = rawInput.trim().toUpperCase();
    if (trimmed === '' || trimmed === 'X' || trimmed === 'NEW' || trimmed === ' ') {
      enterTeamNamePrompt(state);
    }
    return state;
  }

  const trimmed = rawInput.trim();
  const upper = trimmed.toUpperCase();

  // Echo user input on terminal
  if (trimmed.length > 0) {
    pushLines(state, [{ text: `> ${trimmed}`, kind: 'input' }]);
  } else if (state.phase === 'TEAM_NAME') {
    pushLines(state, [{ text: '> TEAM 1', kind: 'input' }]);
  } else {
    return state;
  }

  switch (state.phase) {
    case 'PRINTER_PROMPT': {
      if (upper.startsWith('Y')) {
        state.L[20] = 0;
        enterTeamNamePrompt(state);
      } else if (upper.startsWith('N')) {
        state.L[20] = 1;
        enterTeamNamePrompt(state);
      } else {
        pushLines(state, [
          { text: 'PLEASE ANSWER YES OR NO', kind: 'warning' },
          { text: 'IS THE PRINTER ATTACHED AND SWITCHED ON ?' },
        ]);
      }
      return state;
    }

    case 'TEAM_NAME': {
      state.teamName = trimmed.length > 0 ? trimmed.toUpperCase() : 'TEAM 1';
      startNewWeek(state);
      return state;
    }

    case 'COMMAND': {
      if (upper === 'H') {
        appendHelpLines(state);
        promptCommand(state);
      } else if (upper === 'R') {
        state.phase = 'INPUT_RAW_ORDER';
        pushLines(state, [{ text: 'RAW MATERIAL ORDER IS (0 - 3000) ?', kind: 'heading' }]);
      } else if (upper === 'D' || upper === 'E' || upper === 'A' || upper === 'U' || upper === 'S') {
        const shiftMap: Record<string, number> = { D: 1, E: 2, A: 3, U: 4, S: 5 };
        const x = shiftMap[upper];
        state.activeShift = x;
        state.P[x] = 0;
        if ((state.week === 25 || state.week === 26) && x !== 5) {
          pushLines(state, [{ text: 'HOLIDAYS: ONLY SUBCONTRACTING ALLOWED', kind: 'warning' }]);
          promptCommand(state);
        } else {
          state.phase = 'INPUT_PRODUCTION';
          pushLines(state, [
            {
              text: `${SHIFT_NAMES[x].trim()} PRODUCTION REQUIRED (0 - ${state.M[x]}) =`,
              kind: 'heading',
            },
          ]);
        }
      } else if (upper === 'X') {
        enterTeamNamePrompt(state);
      } else if (upper === 'Z') {
        enterFinalAnalysis(state);
      } else if (upper === 'C') {
        pushClsDivider(state, `WEEK ${state.week} PLAN`);
        pushLines(state, [
          { text: `   *** CURRENT VALUES (WEEK ${state.week}) ***`, kind: 'heading' },
          { text: '' },
          { text: `${SHIFT_NAMES[1]} SHIFT        ${state.P[1]}` },
          { text: `${SHIFT_NAMES[2]} SHIFT        ${state.P[2]}` },
          { text: `${SHIFT_NAMES[3]} SHIFT        ${state.P[3]}` },
          { text: `${SHIFT_NAMES[4]} SHIFT        ${state.P[4]}` },
          { text: `${SHIFT_NAMES[5]} SHIFT        ${state.P[5]}` },
          { text: `MATERIAL ORDER        ${state.rawOrder}` },
          { text: '' },
          { text: 'TO SUBMIT THE PLAN TYPE C', kind: 'heading' },
          { text: 'TO CHANGE THE PLAN TYPE H' },
        ]);
        state.phase = 'CONFIRM_SUBMIT';
      } else {
        pushLines(state, [{ text: 'COMMAND NOT RECOGNISED', kind: 'error' }]);
        promptCommand(state);
      }
      return state;
    }

    case 'INPUT_RAW_ORDER': {
      const val = Number(trimmed);
      if (!Number.isFinite(val) || trimmed === '' || val < 0 || val > 3000) {
        state.rawOrder = 0;
        pushLines(state, [{ text: 'NUMBER OUTSIDE LIMITS OF 0 AND 3000', kind: 'error' }]);
        promptCommand(state);
      } else {
        state.rawOrder = Math.floor(val);
        pushLines(state, [
          { text: `RAW MATERIAL ORDER SET TO ${state.rawOrder}`, kind: 'success' },
        ]);
        promptCommand(state);
      }
      return state;
    }

    case 'INPUT_PRODUCTION': {
      const x = state.activeShift;
      if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
        pushLines(state, [
          { text: 'INPUT A NUMBER', kind: 'error' },
          { text: `${SHIFT_NAMES[x].trim()} PRODUCTION REQUIRED =`, kind: 'heading' },
        ]);
        return state;
      }
      const val = Number(trimmed);
      if (val < 0 || val > state.M[x]) {
        state.P[x] = 0;
        pushLines(state, [
          { text: `NUMBER OUTSIDE LIMITS OF 0 AND ${state.M[x]}`, kind: 'error' },
        ]);
        promptCommand(state);
        return state;
      }

      const candidate = Math.floor(val);
      state.P[x] = candidate;
      const totalProd = state.P[1] + state.P[2] + state.P[3] + state.P[4] + state.P[5];
      state.M[6] = totalProd;

      if (totalProd > state.I[2]) {
        pushLines(state, [
          {
            text: `TOTAL PRODUCTION OF ${totalProd} IS GREATER THAN THE RAW MATERIAL`,
            kind: 'error',
          },
          { text: `INVENTORY OF ${state.I[2]}`, kind: 'error' },
          { text: 'CHANGE YOUR PRODUCTION REQUESTS', kind: 'warning' },
        ]);
        for (let k = 1; k <= 5; k++) state.P[k] = 0;
        state.M[6] = 0;
        promptCommand(state);
      } else {
        pushLines(state, [
          {
            text: `${SHIFT_NAMES[x].trim()} SHIFT SET TO ${candidate} (TOTAL: ${totalProd} / ${state.I[2]})`,
            kind: 'success',
          },
        ]);
        promptCommand(state);
      }
      return state;
    }

    case 'CONFIRM_SUBMIT': {
      if (upper === 'C') {
        runWeekSimulation(state);
      } else if (upper === 'H') {
        appendHelpLines(state);
        promptCommand(state);
      } else {
        pushLines(state, [{ text: 'TYPE C TO SUBMIT OR H TO CHANGE PLAN', kind: 'warning' }]);
      }
      return state;
    }

    case 'QUIZ_CHECK': {
      const q = state.quizQueue[state.quizIndex];
      if (!q) {
        finishQuizPhase(state);
        return state;
      }
      const userVal = Number(trimmed);
      if (!Number.isFinite(userVal)) {
        pushLines(state, [
          { text: 'INPUT A NUMBER', kind: 'error' },
          { text: q.prompt, kind: 'heading' },
        ]);
        return state;
      }

      state.quizAttempts += 1;
      if (Math.abs(userVal - q.expected) < 0.01) {
        pushLines(state, [{ text: 'CORRECT', kind: 'success' }]);
        state.quizIndex += 1;
        state.quizAttempts = 0;
        if (state.quizIndex >= state.quizQueue.length) {
          finishQuizPhase(state);
        } else {
          emitCurrentQuizPrompt(state);
        }
      } else if (state.quizAttempts < 2) {
        pushLines(state, [{ text: 'INCORRECT, TRY AGAIN', kind: 'warning' }]);
        emitCurrentQuizPrompt(state);
      } else {
        if (state.L[20] === 1) {
          pushLines(state, [
            { text: `CORRECT VALUE= ${fmtMoney(q.expected)}`, kind: 'warning' },
          ]);
        } else {
          state.printerLog.push(`${state.teamName}  WEEK ${state.week}`);
          state.printerLog.push(q.prompt);
          state.printerLog.push(
            `YOUR ANSWER ${userVal}   CORRECT ANSWER ${fmtMoney(q.expected)}`
          );
          state.printerLog.push('');
          pushLines(state, [
            { text: 'LOGGED TO PRINTER (DEVICE 4)', kind: 'muted' },
          ]);
        }
        state.quizIndex += 1;
        state.quizAttempts = 0;
        if (state.quizIndex >= state.quizQueue.length) {
          finishQuizPhase(state);
        } else {
          emitCurrentQuizPrompt(state);
        }
      }
      return state;
    }

    default:
      return state;
  }
}
