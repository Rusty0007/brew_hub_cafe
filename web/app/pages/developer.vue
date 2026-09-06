<script setup lang="ts">
useSeoMeta({
  title: 'Developer | BrewHub Cafe',
  description:
    'Meet the developer behind BrewHub Cafe and learn about the technologies, architecture, and engineering practices used to build the system.',
})

const technologies = [
  'Nuxt 4',
  'Vue 3',
  'TypeScript',
  'Tailwind CSS',
  'Nitro',
  'PostgreSQL',
  'Drizzle ORM',
  'Neon',
  'Docker',
  'Vercel',
]

const architectureHighlights = [
  {
    title: 'Domain-Oriented Architecture',
    description:
      'BrewHub separates authentication, catalog, ordering, inventory, payment, reporting, and observability into clearly owned domains.',
  },
  {
    title: 'Reliable Transactions',
    description:
      'Checkout, payment, inventory reservation, concurrency control, and idempotency protect critical business operations.',
  },
  {
    title: 'Observability',
    description:
      'Structured logs, trace IDs, telemetry, performance monitoring, alerts, and audit records make system behavior easier to understand.',
  },
  {
    title: 'Cloud Deployment',
    description:
      'The Nuxt application is deployed through Vercel and connects securely to a Neon PostgreSQL cloud database.',
  },
]
</script>

<template>
  <main class="bg-stone-50 text-stone-900">
    <!-- Hero -->
    <section
      class="mx-auto grid min-h-[70vh] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8"
    >
      <div class="order-2 lg:order-1">
        <p
          class="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-amber-800"
        >
          Behind BrewHub
        </p>

        <h1
          class="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
        >
          Building better cafe experiences through thoughtful software.
        </h1>

        <p
          class="mt-6 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg"
        >
          BrewHub Cafe was designed and developed as a modern cafe
          management platform combining ordering, inventory, payments,
          reporting, security, and observability in one cohesive system.
        </p>

        <div class="mt-8">
          <p class="text-xl font-semibold">
            RUSTY LLOYD ABANG
          </p>

          <p class="mt-1 text-stone-600">
            Full-Stack Developer · System Architecture Project
          </p>
        </div>
      </div>

      <div class="order-1 flex justify-center lg:order-2">
        <div
          class="relative w-full max-w-md overflow-hidden rounded-4x1 bg-white shadow-xl ring-1 ring-stone-200"
        >
          <img
            src="/images/developer/formal.jpg"
            alt="BrewHub Cafe developer portrait"
            class="aspect-4/5 h-full w-full object-cover object-top"
          >
        </div>
      </div>
    </section>

    <!-- About -->
    <section class="border-y border-stone-200 bg-white">
      <div
        class="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.7fr_1.3fr] lg:px-8"
      >
        <div>
          <p
            class="text-sm font-semibold uppercase tracking-[0.25em] text-amber-800"
          >
            About the Developer
          </p>

          <h2 class="mt-3 text-3xl font-bold">
            From requirements to deployment.
          </h2>
        </div>

        <div class="space-y-5 leading-8 text-stone-600">
          <p>
            The development of BrewHub covers the complete application
            lifecycle: requirements analysis, database design, frontend
            development, backend APIs, domain architecture, transaction
            safety, observability, testing, and cloud deployment.
          </p>

          <p>
            The project focuses not only on producing working features,
            but also on demonstrating architectural decisions that make
            the system maintainable, traceable, secure, and reliable.
          </p>
        </div>
      </div>
    </section>

    <!-- Technology -->
    <section class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <p
        class="text-sm font-semibold uppercase tracking-[0.25em] text-amber-800"
      >
        Technology Stack
      </p>

      <h2 class="mt-3 text-3xl font-bold">
        Technologies behind BrewHub
      </h2>

      <div class="mt-8 flex flex-wrap gap-3">
        <span
          v-for="technology in technologies"
          :key="technology"
          class="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium shadow-sm"
        >
          {{ technology }}
        </span>
      </div>
    </section>

    <!-- Architecture -->
    <section class="bg-stone-900 text-white">
      <div class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <p
          class="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300"
        >
          Engineering
        </p>

        <h2 class="mt-3 text-3xl font-bold">
          Architecture highlights
        </h2>

        <div class="mt-10 grid gap-6 md:grid-cols-2">
          <article
            v-for="item in architectureHighlights"
            :key="item.title"
            class="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h3 class="text-lg font-semibold">
              {{ item.title }}
            </h3>

            <p class="mt-3 leading-7 text-stone-300">
              {{ item.description }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <!-- Closing -->
    <section class="mx-auto max-w-4xl px-6 py-20 text-center">
      <p
        class="text-sm font-semibold uppercase tracking-[0.25em] text-amber-800"
      >
        BrewHub Cafe
      </p>

      <h2 class="mt-4 text-3xl font-bold sm:text-4xl">
        Designed with architecture in mind.
      </h2>

      <p class="mx-auto mt-5 max-w-2xl leading-8 text-stone-600">
        BrewHub demonstrates how modern web development, database
        engineering, reliability practices, and system architecture can
        work together in a complete cafe management platform.
      </p>

      <NuxtLink
        to="/"
        class="mt-8 inline-flex rounded-full bg-stone-900 px-6 py-3 font-medium text-white transition hover:bg-stone-700"
      >
        Back to BrewHub
      </NuxtLink>
    </section>
  </main>
</template>