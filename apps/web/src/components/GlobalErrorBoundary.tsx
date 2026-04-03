import { Component, type ErrorInfo, type ReactNode } from 'react';
import MaintenancePrestige, { PRESTIGE_MSG } from './MaintenancePrestige';

type Props = { children: ReactNode };

type State = { error: Error | null; info: ErrorInfo | null };

/**
 * Remplace l’écran d’erreur React « rouge » par le fallback Prestige (message d’initialisation).
 * Détails techniques repliables pour le debug.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GlobalErrorBoundary]', error, info);
    this.setState({ info });
  }

  override render() {
    const { error, info } = this.state;
    if (error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#050810] p-6 md:p-10">
          <div className="w-full max-w-lg space-y-6">
            <MaintenancePrestige
              title="OMJEP"
              message={PRESTIGE_MSG}
              icon="rings"
            >
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-400/20 to-amber-600/15 px-5 py-2.5 text-sm font-bold text-amber-200 transition hover:brightness-110"
              >
                Recharger la page
              </button>
            </MaintenancePrestige>

            <details className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                Détails techniques (développement)
              </summary>
              <pre className="mt-3 max-h-40 overflow-auto text-[11px] text-slate-500 whitespace-pre-wrap break-words font-mono">
                {error.toString()}
              </pre>
              {error.stack ? (
                <pre className="mt-2 max-h-32 overflow-auto text-[10px] text-slate-600 whitespace-pre-wrap break-words font-mono">
                  {error.stack}
                </pre>
              ) : null}
              {info?.componentStack ? (
                <pre className="mt-2 max-h-32 overflow-auto text-[10px] text-slate-600 whitespace-pre-wrap break-words font-mono">
                  {info.componentStack}
                </pre>
              ) : null}
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
