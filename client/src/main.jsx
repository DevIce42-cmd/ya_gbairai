import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';
import App from './App';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: '#0B141A',
            color: '#E9EDEF',
            padding: 24,
            textAlign: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ maxWidth: 360 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔥</div>
            <h2 style={{ margin: '0 0 8px' }}>Petit souci d&apos;affichage</h2>
            <p style={{ color: '#8696A0', margin: '0 0 18px', fontSize: 14 }}>
              Relance rapidement Y&apos;A GBAIRAI ! pour continuer.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                borderRadius: 999,
                border: 'none',
                background: 'linear-gradient(135deg, #25D366, #00A884)',
                color: '#06130B',
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Recharger l&apos;appli
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const isAndroidWebView =
  typeof navigator !== 'undefined' && navigator.userAgent.includes('YaGbairaiAndroid');

if ('serviceWorker' in navigator && !isAndroidWebView) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
