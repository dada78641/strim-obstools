// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

export interface Logger {
  log: LogMethod
  warn: LogMethod
  error: LogMethod
  setQuiet: (value: boolean) => void
}

export interface LoggerOptions {
  identifier: string
  color?: string
  quiet?: boolean
}

export type LogMethod = {
  // You can pass in a custom template; otherwise, the template is "%o".
  (template: string, ...args: unknown[]): void
  (...args: unknown[]): void
}

/**
 * Creates a logger object with identifier and color.
 * 
 * The object has log, warn and error methods and logs to console.
 */
export function createLogger(options: LoggerOptions): Logger {
  const {identifier, color = 'unset'} = options
  let quiet = options.quiet || false

  const setQuiet = (value: boolean) => {
    quiet = value
  }
  
  const createLogMethod = (method: 'log' | 'warn' | 'error', methodColor?: string): LogMethod => {
    const logColor = methodColor || color
    const style = logColor !== 'unset' ? `color:${logColor};` : ''
    
    const logFunction = (...args: unknown[]) => {
      if (quiet) {
        return
      }
      let messageTemplate: string
      let values: unknown[] = args
      
      if (typeof args[0] === 'string') {
        messageTemplate = args[0] as string
        values = args.slice(1)
      }
      else {
        messageTemplate = '%o'
      }
      
      console[method](
        `%c[${identifier}]%c ${messageTemplate}`,
        style,
        'color:unset;',
        ...values
      )
    }
    
    return logFunction as LogMethod
  }
  
  return {
    setQuiet,
    log: createLogMethod('log'),
    warn: createLogMethod('warn', 'yellow'),
    error: createLogMethod('error', 'red'),
  }
}
