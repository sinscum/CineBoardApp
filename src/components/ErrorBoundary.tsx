import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("CineBoard unhandled error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: "#fff", fontFamily: "monospace" }}>
          <h2 style={{ color: "#e74c3c" }}>Something went wrong</h2>
          <pre style={{ color: "#9fb0bf", whiteSpace: "pre-wrap" }}>
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "#1a2634",
              color: "#f5c14b",
              border: "1px solid #2d4a6b",
              borderRadius: 6,
              cursor: "pointer",
            }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
