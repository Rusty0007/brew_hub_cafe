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

    session: {
      cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
      },
    },

    public: {
      appName: 'BrewHub Cafe',
    },
  },

  nitro: {
    experimental: {
      tasks: true,
    },

    scheduledTasks: {
      '* * * * *': [
        'ordering:recover-expired-pending-orders',
      ],
    },
  },
})