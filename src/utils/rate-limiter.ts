export class RateLimiter {
  private timestamps: number[] = [];
  private readonly limit: number;
  private readonly interval: number;

  constructor(limit: number = 60, interval: number = 60000) {
    this.limit = limit;
    this.interval = interval;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      timestamp => now - timestamp < this.interval
    );

    if (this.timestamps.length >= this.limit) {
      return false;
    }

    this.timestamps.push(now);
    return true;
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      timestamp => now - timestamp < this.interval
    );
    return this.limit - this.timestamps.length;
  }

  getTimeUntilReset(): number {
    if (this.timestamps.length === 0) {
      return 0;
    }
    const oldestTimestamp = Math.min(...this.timestamps);
    return Math.max(0, this.interval - (Date.now() - oldestTimestamp));
  }
}