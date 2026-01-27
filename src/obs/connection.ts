// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import OBSWebSocket, {OBSWebSocketError} from 'obs-websocket-js'
import {ReconnectController} from './reconnect.ts'
import {EventEmitter} from '../util/emitter.ts'
import {createLogger} from '../util/logger.ts'
import {sleep, rejectAfter} from '../util/data.ts'

// Error code thrown when OBS is not ready to perform requests yet.
const OBS_NOT_READY = 207

// Amount of ms we'll wait for the connection to go through before retrying.
// Sometimes a connection can stall for a long time before failing, when a retry
// will succeed more quickly.
const OBS_CONNECT_TIMEOUT = 1000
// Amount of ms we'll wait in between attempts to see if OBS is ready for requests.
const OBS_READY_DELAY = 500

export interface ConnectionEvents {
  ready: []
  connected: []
  disconnected: []
  reconnecting: [delay: number]
  connection_failed: [error: Error]
  error: [error: Error]
}

export interface ObsCredentials {
  address: string | null
  password: string | null
}

export interface ObsIdentificationParams {
  eventSubscriptions?: number
  rpcVersion: number
}

export class ObsConnection extends EventEmitter<ConnectionEvents> {
  public obs = new OBSWebSocket()
  public connected = false
  private logger = createLogger({identifier: 'ObsConnection', color: 'blue'})
  private reconnect = new ReconnectController()
  private credentials: ObsCredentials = {address: null, password: null}
  private params: ObsIdentificationParams = {rpcVersion: 1}

  constructor(credentials?: ObsCredentials, identificationParams?: ObsIdentificationParams) {
    super()
    this.setCredentials(credentials)
    this.setIdentificationParams(identificationParams)
  }

  public setQuiet(value: boolean) {
    this.logger.setQuiet(value)
  }

  public setCredentials(credentials?: ObsCredentials) {
    this.credentials.address = credentials?.address ?? null
    this.credentials.password = credentials?.password ?? null
  }

  public setIdentificationParams(identificationParams?: ObsIdentificationParams) {
    if (identificationParams) {
      this.params = identificationParams
    }
  }

  async connect(): Promise<void> {
    return this.tryConnect()
  }

  private async tryConnect(): Promise<void> {
    if (this.connected) {
      return
    }

    const {address, password} = this.credentials

    if (!address) {
      throw new Error('No OBSWS credentials specified')
    }

    try {
      await Promise.race([
        this.obs.connect(address, password ?? undefined, this.params),
        rejectAfter<Error>(OBS_CONNECT_TIMEOUT, new Error('timed out'))
      ])
      this.connected = true
      this.reconnect.reset()
      this.logger.log('connected')
      this.emit('connected')
      this.attachEvents()
      this.scheduleReady()
    }
    catch (err: any) {
      this.logger.error('connection failed: %o', err?.message)
      this.emit('connection_failed', err)
      this.scheduleReconnect()
    }
  }

  private attachEvents() {
    this.obs.on('ConnectionClosed', () => {
      if (this.connected) {
        this.connected = false
        this.logger.log('disconnected')
        this.emit('disconnected')
        this.scheduleReconnect()
      }
    })

    this.obs.on('ConnectionError', (err: Error) => {
      this.logger.error('error', err)
      this.emit('error', err)
    })
  }

  /**
   * This attempts to make a request to OBS and emits a "ready" event when successful.
   * 
   * This is the event that consumers should listen for when attempting to use the library.
   * If OBS has to be restarted, this can loop a number of times before it succeeds.
   */
  private async scheduleReady() {
    try {
      const res = await this.obs.call('GetVersion')
      this.logger.log('OBS version %o, WS version %o', res.obsVersion, res.obsWebSocketVersion)
      this.emit('ready')
    }
    catch (err: any) {
      if (!(err instanceof OBSWebSocketError) || err.code !== OBS_NOT_READY) {
        throw err
      }
      await sleep(OBS_READY_DELAY)
      this.scheduleReady()
    }
  }

  private async scheduleReconnect() {
    const delay = this.reconnect.nextDelay()
    this.logger.log('reconnecting', {delay})
    this.emit('reconnecting', delay)
    await sleep(delay)
    this.tryConnect()
  }
}
