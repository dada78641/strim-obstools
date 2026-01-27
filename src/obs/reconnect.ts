// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

export class ReconnectController {
  private attempt = 0
  readonly baseDelay = 1000

  nextDelay(): number {
    // Maybe eventually we'll do an exponential delay here.
    // For now this is fine since all our connections are local anyway.
    this.attempt++
    return this.baseDelay
  }

  reset(): void {
    this.attempt = 0
  }
}
