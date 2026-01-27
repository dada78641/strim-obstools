// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

type Listener<T extends any[]> = (...args: T) => void

export class EventEmitter<Events extends {[K in keyof Events]: any[]}> {
  private listeners: {[K in keyof Events]?: Listener<Events[K]>[]} = {}

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>) {
    (this.listeners[event] ??= []).push(fn)
  }

  off<K extends keyof Events>(event: K, fn: Listener<Events[K]>) {
    this.listeners[event] = (this.listeners[event] ?? []).filter(l => l !== fn)
  }

  once<K extends keyof Events>(event: K, fn: Listener<Events[K]>) {
    const wrapper: Listener<Events[K]> = (...args) => {
      this.off(event, wrapper)
      fn(...args)
    }
    this.on(event, wrapper)
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]) {
    for (const fn of this.listeners[event] ?? []) {
      fn(...args)
    }
  }
}
