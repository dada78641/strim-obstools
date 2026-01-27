// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import {omit} from 'lodash-es'
import type {SceneItem, Source} from '../../obs/types.ts'

export interface Tag {
  key: string | null
  value?: string | null
}

export interface SearchOptions {
  inputKind?: string
  tag?: Tag
}

/**
 * Returns whether a tag item (key or value) matches.
 * 
 * Also returns true, if isOptional is true and itemA is undefined; this is used for values,
 * which are optional, and should return true even if none is passed.
 */
function matchesTagItem(itemA: string | null | undefined, itemB: string | null | undefined, isOptional: boolean = false) {
  const itemAValue = typeof itemA === 'string' ? itemA.toLowerCase() : itemA
  const itemBValue = typeof itemB === 'string' ? itemB.toLowerCase() : itemB
  
  if (itemAValue === itemBValue) {
    return true
  }

  if (itemAValue == null && isOptional) {
    return true
  }

  return false
}

/**
 * Converts a scene item to a source.
 * 
 * The inputKind and inputSettings are set to empty values.
 */
export function sceneItemToSource(sceneItem: SceneItem): Source {
  const source = omit(
    sceneItem, [
      '_scene',
      'isGroup',
      'sceneItemBlendMode',
      'sceneItemEnabled',
      'sceneItemId',
      'sceneItemIndex',
      'sceneItemLocked',
      'sceneItemTransform'
    ]
  )
  return {...source, inputKind: null, inputSettings: {}}
}

/**
 * Returns matched tags on a given scene or source name.
 * 
 * Returns match objects for all tags, such as [[Game]] or [[Game:StarCraft]].
 */
export function matchTags(itemName: string): RegExpExecArray[] {
  return [...itemName.matchAll(/\[\[([^:]+?)(:(.+?))?\]\]/g)]
}

/**
 * Extracts tags from a scene or source name.
 * 
 * A tag is in the form of [[TagName]] or [[TagKey:TagValue]].
 * 
 * If only a tag name is present, it will be returned as the key, with the value being null.
 * If no tag is present at all, the tag will have null for both its key and value.
 */
export function extractTags(itemName: string): Tag[] {
  const matches = matchTags(itemName)
  if (matches.length === 0) {
    return []
  }
  return matches.map(match => {
    const key = match[1]
    const value = match[3]
    return {key: key ?? null, value: value ?? null}
  })
}

/**
 * Extracts a single tag from a scene or source name.
 * 
 * In most cases, an item will have only a single tag.
 * This always returns the first tag if there are multiple.
 */
export function extractTag(itemName: string, key?: string): Tag {
  const tags = extractTags(itemName)
  if (tags.length === 0) {
    return {key: null, value: null}
  }
  if (key) {
    const tag = tags.find(tag =>  matchesTagItem(key, tag.key, false))
    if (tag == null) {
      return {key: null, value: null}
    }
    return tag
  }
  return tags[0]
}

/**
 * Returns whether a given scene or source name has a given tag.
 * 
 * If a value is passed, the tag must satisfy both the key and the value.
 */
export function hasTag(itemName: string, key: string | null, value?: string | null) {
  const tags = extractTags(itemName)
  const hasOurTag = tags.find(tag => matchesTagItem(key, tag.key, false) && matchesTagItem(value, tag.value, true))
  return hasOurTag != null
}
