// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

// This file contains additional types for data returned by obs-websocket-js.

export type BlendMode = 
  'OBS_BLEND_NORMAL' |
  'OBS_BLEND_ADDITIVE' |
  'OBS_BLEND_SUBTRACT' |
  'OBS_BLEND_SCREEN' |
  'OBS_BLEND_MULTIPLY' |
  'OBS_BLEND_LIGHTEN' |
  'OBS_BLEND_DARKEN'

export type SourceType =
  'OBS_SOURCE_TYPE_INPUT' |
  'OBS_SOURCE_TYPE_FILTER' |
  'OBS_SOURCE_TYPE_TRANSITION' |
  'OBS_SOURCE_TYPE_SCENE'

export type BoundsType =
  'OBS_BOUNDS_NONE' |
  'OBS_BOUNDS_STRETCH' |
  'OBS_BOUNDS_SCALE_INNER' |
  'OBS_BOUNDS_SCALE_OUTER' |
  'OBS_BOUNDS_SCALE_TO_WIDTH' |
  'OBS_BOUNDS_SCALE_TO_HEIGHT' |
  'OBS_BOUNDS_MAX_ONLY'

export interface Scene {
  sceneIndex: number
  sceneName: string
  sceneUuid: string
}

export interface SceneWithSceneItems {
  sceneIndex: number
  sceneName: string
  sceneUuid: string
  sceneItems: SceneItem[]
}

export interface SceneItem {
  _scene?: Scene
  inputKind: string | null
  isGroup: boolean
  sceneItemBlendMode: BlendMode
  sceneItemEnabled: boolean
  sceneItemId: number
  sceneItemIndex: number
  sceneItemLocked: boolean
  sceneItemTransform: []
  sourceName: string
  sourceType: SourceType
  sourceUuid: string
}

export interface Source {
  inputKind: string | null
  inputSettings: {[key: string]: any}
  sourceName: string
  sourceType: SourceType
  sourceUuid: string
}

export interface SceneItemTransform {
  alignment: number
  boundsAlignment: number
  boundsHeight: number
  boundsType: BoundsType
  boundsWidth: number
  cropBottom: number
  cropLeft: number
  cropRight: number
  cropToBounds: boolean
  cropTop: number
  height: number
  positionX: number
  positionY: number
  rotation: number
  scaleX: number
  scaleY: number
  sourceHeight: number
  sourceWidth: number
  width: number
}
