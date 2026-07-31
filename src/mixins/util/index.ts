// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import {uniqBy} from 'lodash-es'
import type {OBSResponseTypes} from 'obs-websocket-js'
import type {Constructor} from '../../util/mixins.ts'
import type {HasObs} from '../../obstools/base.ts'
import type {Scene, SceneWithSceneItems, SceneItem, Source} from '../../obs/types.ts'
import type {JsonValue, OutputListItem} from '../../types.ts'
import type {SearchOptions} from './util.ts'
import {createLogger} from '../../util/logger.ts'
import {sceneItemToSource, hasTag} from './util.ts'
import {outputStatusStub, streamingName, recordingName, virtualCamName} from './stats.ts'
import type {BaseStats, OutputFrames, WebsocketMessages, OutputStatus} from './stats.ts'

// The status is either a live output, or a stub.
type StatusOutput = OBSResponseTypes['GetOutputStatus'] | (typeof outputStatusStub)

export function UtilMixin<TBase extends Constructor<HasObs>>(Base: TBase) {
  return class extends Base {
    public logger = createLogger({identifier: 'ObsTools', color: 'red'})
    
    /**
     * Returns all scenes in the current collection.
     */
    public async getCollectionScenes(): Promise<Scene[]> {
      const res = await this.obs.call('GetSceneList')
      const scenes = res.scenes as unknown as Scene[]
      return scenes
    }

    /**
     * Returns the full OBS status.
     * 
     * This includes the frames per second, the dropped frames, network congestion, and so on.
     */
    public async getSystemStatus(): Promise<BaseStats> {
      const stats: OBSResponseTypes['GetStats'] = await this.obs.call('GetStats')
      const outputListRes: OBSResponseTypes['GetOutputList'] = await this.obs.call('GetOutputList')
      const outputList: OutputListItem[] = outputListRes.outputs as unknown as OutputListItem[]
      
      const outputItemStreaming = outputList.find(output => output.outputName === streamingName)
      const outputItemRecording = outputList.find(output => output.outputName === recordingName)
      const outputItemVirtualCam = outputList.find(output => output.outputName === virtualCamName)

      const streamingStatus: StatusOutput = outputItemStreaming ? await this.obs.call('GetOutputStatus', {outputName: 'adv_stream'}) : outputStatusStub
      const recordingStatus: StatusOutput = outputItemRecording ? await this.obs.call('GetOutputStatus', {outputName: 'adv_file_output'}) : outputStatusStub
      const virtualCamStatus: StatusOutput = outputItemVirtualCam ? await this.obs.call('GetOutputStatus', {outputName: 'virtualcam_output'}) : outputStatusStub

      return {
        activeFps: stats.activeFps,
        availableDiskSpace: stats.availableDiskSpace,
        averageFrameRenderTime: stats.averageFrameRenderTime,
        cpuUsage: stats.cpuUsage,
        memoryUsage: stats.memoryUsage,
        render: {
          skippedFrames: stats.renderSkippedFrames,
          totalFrames: stats.renderTotalFrames,
        },
        output: {
          skippedFrames: stats.outputSkippedFrames,
          totalFrames: stats.outputTotalFrames,
        },
        websocket: {
          incoming: stats.webSocketSessionIncomingMessages,
          outgoing: stats.webSocketSessionOutgoingMessages,
        },
        status: {
          streaming: this._wrapOutputStatus(streamingStatus, outputItemStreaming, streamingName),
          recording: this._wrapOutputStatus(recordingStatus, outputItemRecording, recordingName),
          virtualCam: this._wrapOutputStatus(virtualCamStatus, outputItemVirtualCam, virtualCamName),
        },
      }
    }

    /**
     * Wraps the output status data into a single object.
     * 
     * Used by the system status call.
     */
    public _wrapOutputStatus(outputStatus: StatusOutput, outputListItem: OutputListItem | undefined, outputName: string): OutputStatus {
      return {
        active: outputStatus.outputActive,
        reconnecting: outputStatus.outputReconnecting,
        name: outputName,
        kind: outputListItem?.outputKind ?? '',
        width: outputListItem?.outputWidth ?? 0,
        height: outputListItem?.outputHeight ?? 0,
        timecode: outputStatus.outputTimecode,
        duration: outputStatus.outputDuration,
        bytes: outputStatus.outputBytes,
        congestion: outputStatus.outputCongestion,
        output: {
          skippedFrames: outputStatus.outputSkippedFrames,
          totalFrames: outputStatus.outputTotalFrames,
        }
      }
    }

    /**
     * Adds sources to a list of scenes and returns the result.
     * 
     * Sources are returned as scene items, meaning they have their scene-specific data.
     */
    public async applySceneItems(scenes: Scene[]): Promise<SceneWithSceneItems[]> {
      const batchRes = await this.obs.callBatch(scenes.map(({sceneName}) => ({requestType: 'GetSceneItemList', requestData: {sceneName}})))
      const scenesWithSceneItems = batchRes
        .map((res, n) => {
          // Technically this should never be null, but the types don't properly reflect that.
          if (res == null || res?.responseData == null) {
            return
          }
          const data = res.responseData as OBSResponseTypes['GetSceneItemList']
          const items = data.sceneItems as unknown as SceneItem[]
          return {
            ...scenes[n],
            sceneItems: items,
          }
        })
        .filter(res => res != null)
      return scenesWithSceneItems
    }

    /**
     * Returns all scenes in the current collection with scene items included.
     * 
     * Scene item input settings are not included.
     */
    public async getCollectionScenesWithSceneItems(): Promise<SceneWithSceneItems[]> {
      const scenes = await this.getCollectionScenes()
      const scenesWithSceneItems = await this.applySceneItems(scenes)
      return this.applySceneReferences(scenesWithSceneItems)
    }

    /**
     * Returns a scene with scene items.
     */
    public async getSceneWithSceneItems(sceneUuid: string): Promise<SceneItem[]> {
      const sceneItems = await this.obs.call('GetSceneItemList', {sceneUuid})
      return sceneItems.sceneItems as unknown as SceneItem[]
    }

    /**
     * Adds _scene references to a list of scenes with scene items.
     */
    public async applySceneReferences(scenesWithSceneItems: SceneWithSceneItems[]): Promise<SceneWithSceneItems[]> {
      return scenesWithSceneItems
        .map(scene => ({
          ...scene,
          sceneItems: scene.sceneItems.map(sceneItem => ({
            ...sceneItem,
            _scene: scene
          }))
        }))
    }

    /**
     * Returns all sources in the current collection.
     * 
     * All source settings are included. Nested scenes aren't really sources, so they are not included.
     * 
     * Sources do not retain their scene-specific data.
     */
    public async getCollectionSources(): Promise<Source[]> {
      // First, get a list of all scenes.
      const scenes = await this.getCollectionScenes()
      
      // Fetch all scene items for those scenes.
      const scenesWithSceneItems = await this.applySceneItems(scenes)

      // Unpack all scene items into a flat array.
      const sources = scenesWithSceneItems
        .reduce(
          (accSources: Source[], sceneWithSceneItems) => {
            return [
              ...accSources,
              ...sceneWithSceneItems.sceneItems.map(sceneItem => sceneItemToSource(sceneItem))
            ]
          },
          []
        )
        .filter(source => source.sourceType !== 'OBS_SOURCE_TYPE_SCENE')
      
      // Now fetch the input settings for each source.
      const batchRes = await this.obs.callBatch(sources.map(source => ({requestType: 'GetInputSettings', requestData: {inputUuid: source.sourceUuid}})))
      const sourcesWithSettings = sources.map((source, n) => {
        const sourceSettings = batchRes[n]
        // If we couldn't get the input settings for this source, just silently ignore it.
        // This typically happens when the source is a nested scene.
        if (sourceSettings.requestStatus.result !== true) {
          return source
        }
        return {...source, ...sourceSettings.responseData}
      })

      return sourcesWithSettings
    }

    /**
     * Returns all browser sources.
     */
    public async getCollectionBrowserSources(onlyRemote = false, onlyLocal = false): Promise<Source[]> {
      let sources = (await this.getCollectionSources())
        .filter(source => source.inputKind === 'browser_source')
      if (onlyRemote) {
        sources = sources.filter(source => source.inputSettings?.url != null)
      }
      if (onlyLocal) {
        sources = sources.filter(source => source.inputSettings?.url == null)
      }
      return sources
    }

    /**
     * Searches through all scenes to find particular ones.
     */
    public async findScenes(opts: SearchOptions): Promise<Scene[]> {
      const scenes = await this.getCollectionScenes()
      const matchingScenes = []
      for (const scene of scenes) {
        if (opts.tag && hasTag(scene.sceneName, opts.tag.key, opts.tag.value)) {
          matchingScenes.push(scene)
        }
        if (!opts.tag) {
          matchingScenes.push(scene)
        }
      }
      return matchingScenes
    }

    /**
     * Sends a custom event with a realm.
     *
     * This is essentially just a regular custom event using a ruleset I use in my software.
     */
    public async sendRealmEvent<T = any>(realm: string, data: T) {
      return this.obs.call('BroadcastCustomEvent', {eventData: {realm, data: data as JsonValue}})
    }

    /**
     * Searches through all scene items to find particular ones.
     */
    public async findSceneItems(opts: SearchOptions): Promise<SceneItem[]> {
      const scenesWithSceneItems = await this.getCollectionScenesWithSceneItems()
      const matchingSceneItems = []
      for (const scene of scenesWithSceneItems) {
        for (const sceneItem of scene.sceneItems) {
          if (opts.inputKind && sceneItem.inputKind === opts.inputKind) {
            matchingSceneItems.push(sceneItem)
          }
          if (opts.tag && hasTag(sceneItem.sourceName, opts.tag.key, opts.tag.value)) {
            matchingSceneItems.push(sceneItem)
          }
          if (!opts.inputKind && !opts.tag) {
            matchingSceneItems.push(sceneItem)
          }
        }
      }
      return matchingSceneItems
    }

    /**
     * Returns unique scene items by a given criteria.
     */
    public async findUniqueSceneItems(opts: SearchOptions): Promise<SceneItem[]> {
      const matchingSceneItems = await this.findSceneItems(opts);
      return uniqBy(matchingSceneItems, 'sourceUuid')
    }
  }
}
