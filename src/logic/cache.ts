export class CachedValue<T> {
  private _value: T | undefined;
  private _ts = 0;

  constructor(private readonly ttlMs: number) {}

  get(): T | undefined {
    if (this._ts > 0 && Date.now() - this._ts < this.ttlMs) return this._value;
    return undefined;
  }

  set(v: T): void {
    this._value = v;
    this._ts = Date.now();
  }

  invalidate(): void {
    this._ts = 0;
  }

  ageMs(): number {
    return this._ts > 0 ? Date.now() - this._ts : -1;
  }
}

export class KeyedCache<T> {
  private readonly _map = new Map<string, { value: T; ts: number }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this._map.get(key);
    if (entry && Date.now() - entry.ts < this.ttlMs) return entry.value;
    return undefined;
  }

  set(key: string, value: T): void {
    this._map.set(key, { value, ts: Date.now() });
  }

  invalidate(key: string): void {
    this._map.delete(key);
  }

  snapshot(): Array<{ key: string; ageMs: number; value: T }> {
    const now = Date.now();
    return Array.from(this._map.entries()).map(([key, { value, ts }]) => ({
      key,
      ageMs: now - ts,
      value,
    }));
  }
}

export class SessionTracker {
  private readonly _hashes = new Map<string, string>();

  check(key: string, content: string): "new" | "duplicate" {
    const h = this._hash(content);
    if (this._hashes.get(key) === h) return "duplicate";
    this._hashes.set(key, h);
    return "new";
  }

  seen(): string[] {
    return Array.from(this._hashes.keys());
  }

  private _hash(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h) ^ s.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
  }
}
