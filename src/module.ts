import { defineNuxtModule, addPlugin, addServerHandler, hasNuxtModule, createResolver, addComponent, logger } from '@nuxt/kit'
import { addCustomTab } from '@nuxt/devtools-kit'
import { resolvePath } from 'mlly'
import { schema } from './schema'
import type { ModuleOptions, NuxtIconRuntimeOptions } from './types'
import { unocssIntegration } from './integrations/unocss'
import { registerServerBundle } from './bundle-server'
import { registerClientBundle } from './bundle-client'
import { NuxtIconModuleContext } from './context'

export type { ModuleOptions }

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxt/icon',
    configKey: 'icon',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  defaults: {
    // Module options
    componentName: 'Icon',
    serverBundle: 'auto',
    serverKnownCssClasses: [],
    clientBundle: {
      icons: [],
    },

    // Runtime options
    provider: schema['provider'].$default,
    class: schema['class'].$default,
    size: schema['size'].$default,
    aliases: schema['aliases'].$default,
    iconifyApiEndpoint: schema['iconifyApiEndpoint'].$default,
    localApiEndpoint: schema['localApiEndpoint'].$default,
    fallbackToApi: schema['fallbackToApi'].$default,
    cssSelectorPrefix: schema['cssSelectorPrefix'].$default,
    cssWherePseudo: schema['cssWherePseudo'].$default,
    cssLayer: schema['cssLayer'].$default,
    mode: schema['mode'].$default,
    attrs: schema['attrs'].$default,
    collections: schema['collections'].$default,
    customize: schema['customize'].$default,
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    if (!options.provider) {
      // Use `server` provider when SSR is disabled or generate mode
      options.provider = (!nuxt.options.ssr || nuxt.options._generate)
        ? 'iconify'
        : 'server'
    }

    const ctx = new NuxtIconModuleContext(nuxt, options)
    if (options.serverBundle === 'auto')
      logger.info(`Nuxt Icon server bundle mode is set to \`${ctx.serverBundle}\``)

    addPlugin(
      resolver.resolve('./runtime/plugin'),
    )
    addComponent({
      name: options.componentName || 'Icon',
      global: true,
      filePath: resolver.resolve('./runtime/components/index'),
    })
    addServerHandler({
      route: `${options.localApiEndpoint || '/api/_nuxt_icon'}/:collection`,
      handler: resolver.resolve('./runtime/server/api'),
    })

    // Merge options to app.config
    const runtimeOptions = Object.fromEntries(
      Object.entries(options)
        .filter(([key]) => key in schema),
    ) as NuxtIconRuntimeOptions
    if (!runtimeOptions.collections) {
      runtimeOptions.collections = ctx.getRuntimeCollections(runtimeOptions)
    }
    nuxt.options.appConfig.icon = Object.assign(
      nuxt.options.appConfig.icon || {},
      runtimeOptions,
    )

    // Define types for the app.config compatible with Nuxt Studio
    nuxt.hook('schema:extend', (schemas) => {
      schemas.push({
        appConfig: {
          icon: schema,
        },
      })
    })

    registerServerBundle(ctx)
    registerClientBundle(ctx)

    // Devtools
    addCustomTab({
      name: 'icones',
      title: 'Icônes',
      icon: 'https://icones.js.org/favicon.svg',
      view: {
        type: 'iframe',
        src: 'https://icones.js.org',
      },
    })

    // Server-only runtime config for known CSS selectors
    options.serverKnownCssClasses ||= []
    const serverKnownCssClasses = options.serverKnownCssClasses || []
    nuxt.options.runtimeConfig.icon = {
      serverKnownCssClasses,
    }
    nuxt.hook('nitro:init', async (_nitro) => {
      _nitro.options.runtimeConfig.icon = {
        serverKnownCssClasses,
      }
    })

    if (hasNuxtModule('@unocss/nuxt'))
      unocssIntegration(nuxt, options)

    await nuxt.callHook('icon:serverKnownCssClasses', serverKnownCssClasses)
  },
})
