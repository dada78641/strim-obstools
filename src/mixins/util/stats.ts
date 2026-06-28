// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

export interface BaseStats {
  activeFps: number
  availableDiskSpace: number
  averageFrameRenderTime: number
  cpuUsage: number
  memoryUsage: number
  render: OutputFrames,
  output: OutputFrames,
  websocket: WebsocketMessages,
  status: {
    streaming: OutputStatus
    recording: OutputStatus
    virtualCam: OutputStatus
  }
}

export interface OutputFrames {
  skippedFrames: number
  totalFrames: number
}

export interface WebsocketMessages {
  incoming: number
  outgoing: number
}

export interface OutputStatus {
  active: boolean
  reconnecting: boolean
  kind: string
  name: string
  width: number
  height: number
  timecode: string
  duration: number
  bytes: number
  congestion: number
  output: OutputFrames
}

export const streamingName = 'adv_stream'
export const recordingName = 'adv_file_output'
export const virtualCamName = 'virtualcam_output'

export const outputStatusStub = {
  outputActive: false,
  outputReconnecting: false,
  outputTimecode: '',
  outputDuration: 0,
  outputCongestion: 0,
  outputBytes: 0,
  outputSkippedFrames: 0,
  outputTotalFrames: 0,
}
