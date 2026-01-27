// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

/**
 * Returns a promise that resolves after a given number of milliseconds.
 * 
 * Resolves with 'undefined' by default.
 */
export const sleep = <T = undefined>(ms: number, value: T | undefined = undefined) =>
  new Promise(resolve => setTimeout(() => resolve(value), ms))

/**
 * Returns a promise that rejects after a given number of milliseconds.
 * 
 * Rejects with 'undefined' by default.
 * 
 * Use in Promise.race() to add a timeout to a promise.
 */
export const rejectAfter = <T = undefined>(ms: number, value: T | undefined = undefined) =>
  new Promise((_, reject) => setTimeout(() => reject(value), ms))
