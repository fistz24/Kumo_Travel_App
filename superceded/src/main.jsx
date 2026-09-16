import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('Kumo crashed:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          fontFamily: 'monospace', padding: 24, maxWidth: 900, margin: '0 auto',
          color: '#3A352E', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          <h2 style={{ color: '#C75C4A' }}>Kumo failed to render</h2>
          <p>{String(this.state.error && this.state.error.message || this.state.error)}</p>
          <details open style={{ marginTop: 16 }}>
            <summary>Stack trace (copy this if reporting the issue)</summary>
            <pre style={{ fontSize: 12, background: '#F5F0E8', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
              {this.state.error && this.state.error.stack}
              {this.state.info && this.state.info.componentStack}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

// Catch errors that happen outside React's render (e.g. a script/module that
// fails to load or throws at import time) — these would otherwise leave the
// page silently blank with no on-screen indication anything went wrong.
window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<div style="font-family: monospace; padding: 24px; color: #C75C4A; white-space: pre-wrap;">Kumo failed to load.\n\n${(e.error && e.error.stack) || e.message}</div>`;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
