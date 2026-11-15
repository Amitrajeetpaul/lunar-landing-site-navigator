import { Component, type ReactNode } from 'react';

/** One failing component must not blank the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { err: String((e as Error)?.message ?? e) }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="sheet" role="alert" style={{ maxWidth: 560, margin: '10vh auto', color: '#e8ecf5', font: '15px/1.5 Figtree, system-ui, sans-serif' }}>
        <h2 style={{ margin: '0 0 8px' }}>Something went wrong</h2>
        <p style={{ color: '#9aa6c4' }}>The app hit an unexpected error: {this.state.err}</p>
        <button onClick={() => { location.href = location.pathname; }}>Reset and reload</button>
      </div>
    );
  }
}
