import { Component } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Rabbitstake app render failed.", error, info);
  }

  handleRetry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const message =
      this.state.error instanceof Error
        ? this.state.error.message
        : "The dashboard could not render.";

    return (
      <main className="grid min-h-dvh place-items-center bg-aurora px-5 text-green">
        <section className="section-card w-full max-w-xl rounded-[1.5rem] p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/58">
              Dashboard Sync Error
            </p>
          </div>
          <h1 className="mt-4 font-display text-3xl font-black text-green">
            The dashboard needs a fresh sync.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/72">{message}</p>
          <Button className="mt-6 w-full" type="button" onClick={this.handleRetry}>
            <RefreshCw className="mr-2 h-5 w-5" />
            Retry Sync
          </Button>
        </section>
      </main>
    );
  }
}
