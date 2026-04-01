import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { error: Error | null; info: ErrorInfo | null };

/**
 * Affiche l’erreur et la stack à l’écran au lieu d’un écran noir silencieux.
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
        <div className="min-h-screen bg-[#050810] text-slate-200 p-6 md:p-10">
          <h1 className="text-lg font-black text-red-400 mb-2 tracking-tight">Erreur de rendu React</h1>
          <p className="text-xs text-slate-500 mb-4">
            Corrigez l’erreur ci-dessous ou ouvrez la console (F12) pour plus de détails.
          </p>
          <pre className="rounded-xl border border-red-500/30 bg-black/40 p-4 text-sm text-red-200/95 whitespace-pre-wrap break-words font-mono">
            {error.toString()}
          </pre>
          {error.stack ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-amber-500/90 font-semibold">Stack trace</summary>
              <pre className="mt-2 text-[11px] text-slate-500 whitespace-pre-wrap break-words font-mono p-3 rounded-lg bg-white/[0.03] border border-white/10">
                {error.stack}
              </pre>
            </details>
          ) : null}
          {info?.componentStack ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-amber-500/90 font-semibold">Arbre des composants</summary>
              <pre className="mt-2 text-[11px] text-slate-500 whitespace-pre-wrap break-words font-mono p-3 rounded-lg bg-white/[0.03] border border-white/10">
                {info.componentStack}
              </pre>
            </details>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-8 px-4 py-2 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-bold hover:bg-amber-400"
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
