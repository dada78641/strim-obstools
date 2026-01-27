// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import OBSWebSocket from 'obs-websocket-js'
import {ObsConnection} from '../obs/connection.ts'
import type {ObsCredentials, ObsIdentificationParams} from '../obs/connection.ts'

export interface HasObs {
  obs: OBSWebSocket
}

export class ObsToolsBase {
  public obs
  private conn = new ObsConnection()

  // Pass on the connection event emitter.
  on = this.conn.on.bind(this.conn)
  off = this.conn.off.bind(this.conn)
  once = this.conn.once.bind(this.conn)
  
  constructor(credentials?: ObsCredentials, identificationParams?: ObsIdentificationParams, autoConnect: boolean = true) {
    this.obs = this.conn.obs
    this.conn.setCredentials(credentials)
    this.conn.setIdentificationParams(identificationParams)

    if (autoConnect) {
      this.connect()
    }
  }

  public connect() {
    return this.conn.connect()
  }

  public get connected() {
    return this.conn.connected
  }

  public setCredentials(credentials?: ObsCredentials) {
    this.conn.setCredentials(credentials)
  }
}
