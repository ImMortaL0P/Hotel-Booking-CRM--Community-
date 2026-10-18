
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { DataProvider } from "./app/data/DataContext";
import { ThemeProvider } from "./app/components/ThemeProvider";
import "./styles/index.css";

class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("GlobalErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', background: '#09090b', color: '#ef4444', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>ShardaCRM Error Boundary</h1>
          <p style={{ color: '#d4d4d8', fontSize: 13 }}>An uncaught error occurred while rendering the application:</p>
          <pre style={{ background: '#18181b', padding: 20, borderRadius: 12, border: '1px solid #27272a', color: '#fca5a5', fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack || String(this.state.error)}
          </pre>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
              }}
              style={{ padding: '10px 20px', background: '#ef4444', color: '#fff', border: 0, borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >
              Reset Session & Go to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '10px 20px', background: '#27272a', color: '#fafafa', border: '1px solid #3f3f46', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <ThemeProvider defaultTheme="light" storageKey="hotel-crm-theme">
      <DataProvider>
        <App />
      </DataProvider>
    </ThemeProvider>
  </GlobalErrorBoundary>
);
  