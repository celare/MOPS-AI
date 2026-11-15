import React, { useEffect, useRef, useState } from 'react';
import { CornerDownLeft, RotateCcw, Trash2 } from 'lucide-react';
import { MopState, SHIFT_CAPS, SHIFT_SHORT_NAMES } from '../engine/mopEngine';

interface TerminalViewProps {
  state: MopState;
  onSubmitInput: (value: string) => void;
  onNewGame: () => void;
  onClearScrollback: () => void;
}

const COMMAND_KEYS: Array<{ key: string; label: string; desc: string }> = [
  { key: 'R', label: 'R', desc: 'Order' },
  { key: 'D', label: 'D', desc: 'Day' },
  { key: 'E', label: 'E', desc: 'Eve' },
  { key: 'A', label: 'A', desc: 'Sat' },
  { key: 'U', label: 'U', desc: 'Sun' },
  { key: 'S', label: 'S', desc: 'Sub' },
  { key: 'C', label: 'C', desc: 'Submit' },
  { key: 'H', label: 'H', desc: 'Help' },
  { key: 'Z', label: 'Z', desc: 'End' },
];

export const TerminalView: React.FC<TerminalViewProps> = ({
  state,
  onSubmitInput,
  onNewGame,
  onClearScrollback,
}) => {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isWaitPhase =
    state.phase === 'REPORT_WAIT_1' ||
    state.phase === 'REPORT_WAIT_2' ||
    state.phase === 'REPORT_WAIT_3' ||
    state.phase === 'REPORT_WAIT_4' ||
    state.phase === 'POST_QUIZ_WAIT' ||
    state.phase === 'GAME_OVER';

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [state.terminalLines.length, state.phase]);

  useEffect(() => {
    if (!isWaitPhase && inputRef.current) {
      // Only auto-focus on desktop viewports so mobile doesn't pop keyboard unexpectedly
      if (window.innerWidth >= 1024) {
        inputRef.current.focus();
      }
    }
  }, [state.phase, state.quizIndex, isWaitPhase]);

  useEffect(() => {
    if (!isWaitPhase) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onSubmitInput(' ');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWaitPhase, onSubmitInput]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isWaitPhase) {
      onSubmitInput(' ');
      return;
    }
    const val = inputValue;
    setInputValue('');
    onSubmitInput(val);
  };

  const getPromptHint = (): { label: string; inputMode: 'text' | 'numeric' | 'decimal'; placeholder: string } => {
    switch (state.phase) {
      case 'PRINTER_PROMPT':
        return { label: 'Printer attached?', inputMode: 'text', placeholder: 'Type YES or NO...' };
      case 'TEAM_NAME':
        return { label: 'Team name', inputMode: 'text', placeholder: 'Enter production team name...' };
      case 'COMMAND':
        return {
          label: `Week ${state.week} command`,
          inputMode: 'text',
          placeholder: 'Command (H, R, D, E, A, U, S, C, X, Z)...',
        };
      case 'INPUT_RAW_ORDER':
        return {
          label: 'Raw material order (0–3000)',
          inputMode: 'numeric',
          placeholder: 'Enter quantity 0 to 3000...',
        };
      case 'INPUT_PRODUCTION': {
        const cap = SHIFT_CAPS[state.activeShift] ?? 400;
        const name = SHIFT_SHORT_NAMES[state.activeShift] ?? 'Shift';
        return {
          label: `${name} (0–${cap})`,
          inputMode: 'numeric',
          placeholder: `Enter units 0 to ${cap}...`,
        };
      }
      case 'CONFIRM_SUBMIT':
        return {
          label: 'Confirm submission',
          inputMode: 'text',
          placeholder: 'Type C to submit or H to edit...',
        };
      case 'QUIZ_CHECK':
        return {
          label: 'Calculation check',
          inputMode: 'decimal',
          placeholder: 'Enter calculated amount...',
        };
      default:
        return { label: 'Continue', inputMode: 'text', placeholder: 'Press Space or Continue...' };
    }
  };

  const hint = getPromptHint();
  const isHoliday = state.week === 25 || state.week === 26;

  return (
    <section
      aria-label="MOP Interactive Text Terminal"
      className="flex h-full min-h-[460px] flex-col overflow-hidden rounded-2xl border border-[#223036] bg-[#0d1315]"
    >
      {/* Terminal Bezel Toolbar */}
      <div className="flex items-center justify-between gap-4 border-b border-[#1c272c] bg-[#11181b] px-4 py-2.5">
        <div className="flex items-center gap-3 text-xs text-[#90a4ab] min-w-0">
          <span className="font-mono font-semibold text-emerald-300 whitespace-nowrap">
            {state.teamName ? state.teamName : 'SESSION READY'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono whitespace-nowrap">
            {state.week >= 13 && state.week <= 32 ? `Week ${state.week} of 32` : 'Setup'}
          </span>
          {isHoliday && state.week >= 13 && state.week <= 32 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-amber-300 whitespace-nowrap">Holiday Period</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClearScrollback}
            title="Clear terminal scrollback"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#233036] px-2.5 py-1.5 text-xs font-medium text-[#90a4ab] transition-colors hover:border-[#344850] hover:text-[#e6edf0] whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            type="button"
            onClick={onNewGame}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#233036] px-2.5 py-1.5 text-xs font-medium text-[#d5e0e4] transition-colors hover:border-emerald-400/50 hover:text-emerald-300 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New Game</span>
          </button>
        </div>
      </div>

      {/* Scrollable CRT Text Output */}
      <div
        ref={scrollRef}
        className="terminal-scroll flex-1 overflow-y-auto bg-[#080c0d] px-4 py-4 font-mono text-[13px] leading-[1.6] sm:px-5 sm:text-sm"
      >
        <div className="space-y-0.5">
          {state.terminalLines.map((line) => {
            if (line.kind === 'divider') {
              return (
                <div
                  key={line.id}
                  className="my-3 flex items-center gap-3 text-[11px] tracking-wider text-[#556b73]"
                >
                  <span className="h-px flex-1 bg-[#1b262a]" />
                  <span>{line.text}</span>
                  <span className="h-px flex-1 bg-[#1b262a]" />
                </div>
              );
            }

            if (line.text === '') {
              return <div key={line.id} className="h-3" aria-hidden="true" />;
            }

            let colorClass = 'text-[#d5e5df]';
            if (line.kind === 'heading') colorClass = 'text-emerald-300 font-semibold';
            else if (line.kind === 'input') colorClass = 'text-sky-300';
            else if (line.kind === 'success') colorClass = 'text-emerald-400 font-medium';
            else if (line.kind === 'warning') colorClass = 'text-amber-300';
            else if (line.kind === 'error') colorClass = 'text-rose-400 font-medium';
            else if (line.kind === 'muted') colorClass = 'text-[#7e949b]';

            return (
              <pre
                key={line.id}
                className={`whitespace-pre-wrap break-words font-mono ${colorClass}`}
              >
                {line.text}
              </pre>
            );
          })}
        </div>
      </div>

      {/* Contextual Action Deck & Command Prompt */}
      <div className="border-t border-[#1c272c] bg-[#101619] p-3 sm:p-4">
        {state.phase === 'PRINTER_PROMPT' && (
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSubmitInput('NO')}
              className="min-h-[44px] flex-1 rounded-lg border border-[#2a383f] bg-[#162024] px-4 py-2 text-xs font-semibold text-[#e6edf0] transition-colors hover:border-emerald-400/60 hover:text-emerald-300"
            >
              No — Screen Only
            </button>
            <button
              type="button"
              onClick={() => onSubmitInput('YES')}
              className="min-h-[44px] flex-1 rounded-lg border border-[#2a383f] bg-[#162024] px-4 py-2 text-xs font-semibold text-[#e6edf0] transition-colors hover:border-emerald-400/60 hover:text-emerald-300"
            >
              Yes — Enable Device 4 Print Log
            </button>
          </div>
        )}

        {state.phase === 'COMMAND' && (
          <div className="mb-3 grid grid-cols-5 gap-1.5 sm:grid-cols-9">
            {COMMAND_KEYS.map((cmd) => {
              const disabledInHoliday =
                isHoliday && (cmd.key === 'D' || cmd.key === 'E' || cmd.key === 'A' || cmd.key === 'U');
              const isSubmit = cmd.key === 'C';
              return (
                <button
                  key={cmd.key}
                  type="button"
                  disabled={disabledInHoliday}
                  onClick={() => onSubmitInput(cmd.key)}
                  title={`${cmd.key} — ${cmd.desc}`}
                  className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg border px-1.5 py-1 text-center transition-colors ${
                    disabledInHoliday
                      ? 'cursor-not-allowed border-[#1b2428] bg-[#0d1214] text-[#4c5f66]'
                      : isSubmit
                        ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25'
                        : 'border-[#253339] bg-[#151e22] text-[#dce7ea] hover:border-emerald-400/50 hover:text-emerald-300'
                  }`}
                >
                  <span className="font-mono text-xs font-bold leading-none">{cmd.label}</span>
                  <span className="mt-1 text-[10px] leading-none text-[#8ca0a7]">{cmd.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        {state.phase === 'CONFIRM_SUBMIT' && (
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => onSubmitInput('C')}
              className="min-h-[44px] flex-1 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-[#08100d] transition-colors hover:bg-emerald-300"
            >
              Submit Week {state.week} Plan (C)
            </button>
            <button
              type="button"
              onClick={() => onSubmitInput('H')}
              className="min-h-[44px] flex-1 rounded-lg border border-[#2a383f] bg-[#162024] px-4 py-2 text-xs font-semibold text-[#e6edf0] transition-colors hover:border-emerald-400/50"
            >
              Change Plan / Help (H)
            </button>
          </div>
        )}

        {isWaitPhase ? (
          <button
            type="button"
            onClick={() => onSubmitInput(' ')}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#08100d] transition-colors hover:bg-emerald-300 active:scale-[0.99]"
          >
            <span>
              {state.phase === 'GAME_OVER' ? 'Start New Session' : 'Continue (Space)'}
            </span>
          </button>
        ) : (
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <label htmlFor="mop-terminal-input" className="sr-only">
              {hint.label}
            </label>
            <div className="relative flex flex-1 items-center rounded-xl border border-[#26343a] bg-[#080c0d] px-3 focus-within:border-emerald-400">
              <span className="mr-2 font-mono text-sm font-bold text-emerald-400" aria-hidden="true">
                &gt;
              </span>
              <input
                ref={inputRef}
                id="mop-terminal-input"
                type="text"
                inputMode={hint.inputMode}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={hint.placeholder}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="min-h-[44px] w-full bg-transparent font-mono text-sm text-[#e6edf0] placeholder:text-[#5b7077] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              aria-label="Send input"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-[#08100d] transition-colors hover:bg-emerald-300 whitespace-nowrap shrink-0"
            >
              <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Enter</span>
            </button>
          </form>
        )}
      </div>
    </section>
  );
};
