import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: {
    enabled: true,
  },

  devServer: {
    host: '127.0.0.1',
    port: 3100,
  },

  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    'nuxt-auth-utils',
    'nuxt-security',
  ],

  css: [
    '~/assets/css/main.css',
  ],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  runtimeConfig: {
    dbHost: '',
    dbPort: 5432,
    dbName: '',
    dbUser: '',
    dbPassword: '',
    dbSchema: 'brewhub',
    dbSsl: false,

    session: {
      cookie: {
        secure:
          process.env.NODE_ENV
          === 'production',

        httpOnly: true,
        sameSite: 'lax',
      },
    },

    public: {
      appName: 'BrewHub Cafe',
    },
  },

  security: {
    csrf: true,
  },

  routeRules: {
    '/login': {
      csurf: {
        methodsToProtect: [
          'POST',
        ],
      },
    },

    '/api/auth/login': {
      csurf: {
        methodsToProtect: [
          'POST',
        ],
      },

      security: {
        rateLimiter: {
          tokensPerInterval: 10,
          interval: 60_000,
          headers: true,
          throwError: true,
        },
      },
    },
  },

  nitro: {
    experimental: {
      tasks: true,
    },

    scheduledTasks: {
      '0 0 * * *': [
        'ordering:recover-expired-pending-orders',
      ],
    },
  },
})