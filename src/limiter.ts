/** Local fixed-window limiter; apply upstream IP restrictions for production deployments. */
export class RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();
  constructor(private readonly max: number, private readonly maxClients = 10000) {}
  allow(ip: string, now = Date.now()): boolean {
    const existing = this.windows.get(ip);
    if (existing && now - existing.start < 60000) {
      existing.count += 1;
      return existing.count <= this.max;
    }
    if (this.windows.size >= this.maxClients) {
      for (const [key, win] of this.windows) if (now - win.start >= 60000) this.windows.delete(key);
      if (this.windows.size >= this.maxClients && !existing) return false;
    }
    this.windows.set(ip, { start: now, count: 1 });
    return true;
  }
}
