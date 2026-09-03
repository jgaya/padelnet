"use client";

type Listener = () => void;

type AsyncFn<Args extends readonly unknown[], Result> = (
  ...args: Args
) => Promise<Result>;

class LoadingStore {
  private activeRequests = 0;
  private listeners = new Set<Listener>();

  get loading() {
    return this.activeRequests > 0;
  }

  start() {
    this.activeRequests += 1;
    this.emit();
  }

  stop() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.emit();
  }

  setLoading(loading: boolean) {
    this.activeRequests = loading ? Math.max(1, this.activeRequests) : 0;
    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const loadingStore = new LoadingStore();

export async function withGlobalLoader<Args extends readonly unknown[], Result>(
  fn: AsyncFn<Args, Result>,
  ...args: Args
): Promise<Result> {
  loadingStore.start();

  try {
    return await fn(...args);
  } finally {
    loadingStore.stop();
  }
}
