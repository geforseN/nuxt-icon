import { computed } from 'vue'
import { loadIcons, getIcon as _getIcon } from '@iconify/vue'
import { consola } from 'consola'
import type { IconifyIcon } from '@iconify/types'
import type { NuxtIconRuntimeOptions } from '../../types'
import { useAppConfig } from '#imports'
import { init as initClientBundle } from '#build/nuxt-icon-client-bundle'

export { initClientBundle }

export async function loadIcon(name: string, timeout: number): Promise<Required<IconifyIcon> | null> {
  if (!name)
    return null
  initClientBundle()
  const _icon = _getIcon(name)
  if (_icon)
    return _icon

  const load = new Promise<void>(resolve => loadIcons([name], () => resolve()))
    .catch(() => null)

  if (timeout > 0)
    await Promise.race([load, new Promise<void>(resolve => setTimeout(() => {
      consola.warn(`[Icon] loading icon \`${name}\` timed out after ${timeout}ms`)
      resolve()
    }, timeout))])
  else
    await load

  return _getIcon(name)
}

export function useResolvedName(getName: () => string) {
  const options = useAppConfig().icon as NuxtIconRuntimeOptions
  const collections = (options.collections || []).sort((a, b) => b.length - a.length)

  return computed(() => {
    const name = getName()
    const bare = name.startsWith(options.cssSelectorPrefix)
      ? name.slice(options.cssSelectorPrefix.length)
      : name
    const resolved = options.aliases?.[bare] || bare

    // Disambiguate collection
    // e.g. `simple-icons-github` -> `simple-icons:github`
    if (!resolved.includes(':')) {
      const collection = collections.find(c => resolved.startsWith(c + '-'))
      return collection
        ? collection + ':' + resolved.slice(collection.length + 1)
        : resolved
    }
    return resolved
  })
}
