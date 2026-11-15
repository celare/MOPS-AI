import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ClipboardList, Info, Printer, Terminal } from 'lucide-react';
import { AboutModal } from './components/AboutModal';
import { LedgerPanel } from './components/LedgerPanel';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PrinterLogPanel } from './components/PrinterLogPanel';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ReferencePanel } from './components/ReferencePanel';
import { TerminalView } from './components/TerminalView';
import {
  buildFinalSummary,
  CompletedSessionSummary,
  createInitialMopState,
  MopState,
  processMopInput,
} from './engine/mopEngine';

type ActiveTab = 'terminal' | 'ledger' | 'reference' | 'printer';

const SESSION_STORAGE_KEY = 'mop_active_session_v1';
const HISTORY_STORAGE_KEY = 'mop_session_history_v1';
const LEGACY_SESSION_KEY = 'mops_active_session_v1';
const LEGACY_HISTORY_KEY = 'mops_session_history_v1';

function loadSavedState(): MopState {
  try {
    const raw =
      localStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return createInitialMopState();
    const parsed = JSON.parse(raw) as MopState;
    if (parsed && Array.isArray(parsed.terminalLines) && typeof parsed.week === 'number') {
      return parsed;
    }
  } catch {
    // Ignore corrupted storage
  }
  return createInitialMopState();
}

function loadPastSessions(): CompletedSessionSummary[] {
  try {
    const raw =
      localStorage.getItem(HISTORY_STORAGE_KEY) || localStorage.getItem(LEGACY_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [mopState, setMopState] = useState<MopState>(loadSavedState);
  const [pastSessions, setPastSessions] = useState<CompletedSessionSummary[]>(loadPastSessions);
  const [mobileTab, setMobileTab] = useState<ActiveTab>('terminal');
  const [desktopSideTab, setDesktopSideTab] = useState<'ledger' | 'reference' | 'printer'>('ledger');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const prevPhaseRef = useRef(mopState.phase);

  useEffect(() => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(mopState));
    } catch {
      // Ignore storage quota errors
    }
  }, [mopState]);

  useEffect(() => {
    if (prevPhaseRef.current !== 'GAME_OVER' && mopState.phase === 'GAME_OVER') {
      const summary = buildFinalSummary(mopState);
      if (summary) {
        setPastSessions((prev) => {
          const updated = [summary, ...prev].slice(0, 15);
          try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // Ignore storage errors
          }
          return updated;
        });
      }
    }
    prevPhaseRef.current = mopState.phase;
  }, [mopState]);

  const handleSubmitInput = useCallback((value: string) => {
    setMopState((prev) => processMopInput(prev, value));
  }, []);

  const handleNewGame = useCallback(() => {
    const fresh = createInitialMopState();
    setMopState(fresh);
    setMobileTab('terminal');
  }, []);

  const handleClearScrollback = useCallback(() => {
    setMopState((prev) => ({
      ...prev,
      terminalLines: prev.terminalLines.slice(-12),
    }));
  }, []);

  const handleQuickCommand = useCallback((cmd: string) => {
    setMopState((prev) => processMopInput(prev, cmd));
    setMobileTab('terminal');
  }, []);

  const handleClearHistory = useCallback(() => {
    setPastSessions([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const handleHeaderNav = (tab: ActiveTab) => {
    setMobileTab(tab);
    if (tab !== 'terminal') {
      setDesktopSideTab(tab);
    }
  };

  return (
    <div className="min-h-dvh bg-[#0b0f10] text-[#e6edf0]">
      {/* Top Bar: 1-row, 3-zone contract */}
      <header className="no-print sticky top-0 z-30 border-b border-[#1c272c] bg-[#0b0f10]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleHeaderNav('terminal');
            }}
            className="text-lg font-bold tracking-tight text-[#e6edf0] whitespace-nowrap shrink-0"
          >
            MOP
          </a>

          <nav
            aria-label="Workspace sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#8ca0a7]"
          >
            <button
              type="button"
              onClick={() => handleHeaderNav('terminal')}
              className={`min-h-[40px] border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                mobileTab === 'terminal'
                  ? 'border-emerald-400 text-[#e6edf0]'
                  : 'border-transparent hover:text-[#e6edf0]'
              }`}
            >
              Terminal
            </button>
            <button
              type="button"
              onClick={() => handleHeaderNav('ledger')}
              className={`min-h-[40px] border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                desktopSideTab === 'ledger'
                  ? 'border-emerald-400 text-[#e6edf0]'
                  : 'border-transparent hover:text-[#e6edf0]'
              }`}
            >
              Plan &amp; Ledger
            </button>
            <button
              type="button"
              onClick={() => handleHeaderNav('reference')}
              className={`min-h-[40px] border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                desktopSideTab === 'reference'
                  ? 'border-emerald-400 text-[#e6edf0]'
                  : 'border-transparent hover:text-[#e6edf0]'
              }`}
            >
              Rate Sheet
            </button>
            <button
              type="button"
              onClick={() => handleHeaderNav('printer')}
              className={`min-h-[40px] border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                desktopSideTab === 'printer'
                  ? 'border-emerald-400 text-[#e6edf0]'
                  : 'border-transparent hover:text-[#e6edf0]'
              }`}
            >
              Print Log
            </button>
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="min-h-[40px] border-b-2 border-transparent transition-colors hover:text-[#e6edf0] whitespace-nowrap shrink-0"
            >
              About
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#2a383f] bg-[#141c1f] px-3 py-2 text-xs font-medium text-[#e6edf0] transition-colors hover:border-emerald-400/50 hover:text-emerald-300 md:hidden whitespace-nowrap shrink-0"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              <span>About</span>
            </button>
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto max-w-[1440px] px-4 pt-3 pb-20 sm:px-6 lg:px-8 lg:py-5">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          {/* Primary Zone: Text Terminal */}
          <div
            className={`${
              mobileTab === 'terminal' ? 'block' : 'hidden'
            } lg:block lg:col-span-7 xl:col-span-8 h-[calc(100dvh-9.5rem)] lg:h-[calc(100dvh-6.75rem)]`}
          >
            <TerminalView
              state={mopState}
              onSubmitInput={handleSubmitInput}
              onNewGame={handleNewGame}
              onClearScrollback={handleClearScrollback}
            />
          </div>

          {/* Secondary Zone: Operations Ledger, Rate Sheet & Device 4 Printer Log */}
          <aside
            aria-label="Operations Reference and Ledger"
            className={`${
              mobileTab !== 'terminal' ? 'block' : 'hidden'
            } lg:block lg:col-span-5 xl:col-span-4 lg:h-[calc(100dvh-6.75rem)] lg:overflow-y-auto terminal-scroll`}
          >
            {/* Desktop Side Panel Tabs */}
            <div className="no-print mb-4 hidden lg:grid grid-cols-3 gap-1 rounded-xl border border-[#223036] bg-[#101619] p-1">
              <button
                type="button"
                onClick={() => setDesktopSideTab('ledger')}
                className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  desktopSideTab === 'ledger'
                    ? 'bg-[#1a252a] text-emerald-300'
                    : 'text-[#8ca0a7] hover:text-[#e6edf0]'
                }`}
              >
                Plan &amp; Ledger
              </button>
              <button
                type="button"
                onClick={() => setDesktopSideTab('reference')}
                className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  desktopSideTab === 'reference'
                    ? 'bg-[#1a252a] text-emerald-300'
                    : 'text-[#8ca0a7] hover:text-[#e6edf0]'
                }`}
              >
                Rate Sheet
              </button>
              <button
                type="button"
                onClick={() => setDesktopSideTab('printer')}
                className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  desktopSideTab === 'printer'
                    ? 'bg-[#1a252a] text-emerald-300'
                    : 'text-[#8ca0a7] hover:text-[#e6edf0]'
                }`}
              >
                Print Log
              </button>
            </div>

            {/* Active Secondary Content */}
            <div className="lg:hidden">
              {mobileTab === 'ledger' && (
                <LedgerPanel
                  state={mopState}
                  pastSessions={pastSessions}
                  onQuickCommand={handleQuickCommand}
                  onClearHistory={handleClearHistory}
                />
              )}
              {mobileTab === 'reference' && <ReferencePanel />}
              {mobileTab === 'printer' && <PrinterLogPanel state={mopState} />}
            </div>

            <div className="hidden lg:block">
              {desktopSideTab === 'ledger' && (
                <LedgerPanel
                  state={mopState}
                  pastSessions={pastSessions}
                  onQuickCommand={handleQuickCommand}
                  onClearHistory={handleClearHistory}
                />
              )}
              {desktopSideTab === 'reference' && <ReferencePanel />}
              {desktopSideTab === 'printer' && <PrinterLogPanel state={mopState} />}
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar (Thumb Zone) */}
      <nav
        aria-label="Mobile navigation"
        className="no-print fixed bottom-0 left-0 right-0 z-40 border-t border-[#1c272c] bg-[#0b0f10]/95 backdrop-blur-md lg:hidden"
      >
        <div className="grid h-15 grid-cols-4 items-center">
          <button
            type="button"
            onClick={() => setMobileTab('terminal')}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-1 ${
              mobileTab === 'terminal' ? 'text-emerald-300' : 'text-[#8ca0a7]'
            }`}
          >
            <Terminal className="h-5 w-5" aria-hidden="true" />
            <span className="text-[11px] font-medium leading-none">Terminal</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('ledger')}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-1 ${
              mobileTab === 'ledger' ? 'text-emerald-300' : 'text-[#8ca0a7]'
            }`}
          >
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            <span className="text-[11px] font-medium leading-none">Ledger</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('reference')}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-1 ${
              mobileTab === 'reference' ? 'text-emerald-300' : 'text-[#8ca0a7]'
            }`}
          >
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            <span className="text-[11px] font-medium leading-none">Rates</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('printer')}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-1 ${
              mobileTab === 'printer' ? 'text-emerald-300' : 'text-[#8ca0a7]'
            }`}
          >
            <Printer className="h-5 w-5" aria-hidden="true" />
            <span className="text-[11px] font-medium leading-none">Print</span>
          </button>
        </div>
      </nav>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <OfflineIndicator />
    </div>
  );
}
