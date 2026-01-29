// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import {uniqBy} from 'lodash-es'
import type {OBSResponseTypes} from 'obs-websocket-js'
import type {Constructor} from '../../util/mixins.ts'
import type {HasObs} from '../../obstools/base.ts'
import type {Scene, SceneWithSceneItems, SceneItem, Source} from '../../obs/types.ts'
import type {SearchOptions} from './util.ts'
import {createLogger} from '../../util/logger.ts'
import {sceneItemToSource, hasTag} from './util.ts'

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
    public async getCollectionBrowserSources(): Promise<Source[]> {
      const sources = (await this.getCollectionSources())
        .filter(source => source.inputKind === 'browser_source')
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
      return uniqBy(matchingSceneItems, 'sourceUuid')
    }
  }
}
