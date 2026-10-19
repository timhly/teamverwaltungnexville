import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import { App } from "./App";
import "./styles.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error)
      return (
        <div className="fatal">
          <h1>Die Ansicht konnte nicht geladen werden.</h1>
          <p>Ausstehende Änderungen bleiben im lokalen Speicher erhalten.</p>
          <button
            className="button button-default"
            onClick={() => location.reload()}
          >
            Seite neu laden
          </button>
        </div>
      );
    return this.props.children;
  }
}
const theme = localStorage.getItem("nexville:theme") || "dark";
document.documentElement.dataset.theme = theme;
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
