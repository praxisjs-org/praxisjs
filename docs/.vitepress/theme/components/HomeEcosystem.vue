<script setup lang="ts">
import { VERSIONS, v } from "../../versions";
// VERSIONS is used only for the satisfies constraint below

const packages = [
  { label: "@praxisjs/core", href: "/essentials/components", status: "stable" },
  { label: "@praxisjs/decorators", href: "/decorators/state", status: "stable" },
  { label: "@praxisjs/jsx", href: "/essentials/jsx", status: "stable" },
  { label: "@praxisjs/runtime", href: "/guide/getting-started", status: "stable" },
  { label: "@praxisjs/router", href: "/ecosystem/router", status: "stable" },
  { label: "@praxisjs/store", href: "/ecosystem/store", status: "stable" },
  { label: "@praxisjs/di", href: "/ecosystem/di", status: "stable" },
  { label: "@praxisjs/motion", href: "/ecosystem/motion", status: "stable" },
  { label: "@praxisjs/fsm", href: "/ecosystem/fsm", status: "stable" },
  { label: "@praxisjs/composables", href: "/composables/dom", status: "stable" },
  { label: "@praxisjs/concurrent", href: "/composables/concurrency", status: "stable" },
  { label: "@praxisjs/devtools", href: "/tooling/devtools", status: "beta" },
  { label: "@praxisjs/storybook", href: "/tooling/storybook", status: "beta" },
] satisfies { label: keyof typeof VERSIONS; href: string; status: string }[];
</script>

<template>
  <section class="ph-ecosystem">
    <div class="ph-container">
      <div class="ph-section-head">
        <h2>First-party ecosystem</h2>
        <p>
          Every package ships with PraxisJS and follows the same design
          philosophy.
        </p>
      </div>
      <div class="ph-pkgs">
        <a
          v-for="p in packages"
          :key="p.label"
          :href="p.href"
          class="ph-pkg"
          :data-status="p.status"
        >
          <span class="ph-pkg-name">{{ p.label }}</span>
          <span class="ph-pkg-meta">
            <span class="ph-pkg-version">{{ v(p.label) }}</span>
            <span class="ph-pkg-badge">{{ p.status }}</span>
          </span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ph-ecosystem {
  padding: 6rem 0;
  background: var(--vp-c-bg-alt);
  border-top: 1px solid var(--vp-c-border);
  border-bottom: 1px solid var(--vp-c-border);
}

.dark .ph-ecosystem {
  background: #0d0b1a;
}

.ph-section-head {
  text-align: center;
  margin-bottom: 3rem;
}
.ph-section-head h2 {
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
}
.ph-section-head p {
  font-size: 1.05rem;
  color: var(--vp-c-text-2);
  margin: 0;
  max-width: 480px;
  margin-inline: auto;
}

.ph-pkgs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
}

.ph-pkg {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  text-decoration: none;
  transition: all 0.18s;
  overflow: hidden;
}
.ph-pkg:hover {
  border-color: rgba(109, 91, 189, 0.4);
  background: var(--vp-c-bg-soft);
  transform: translateY(-1px);
}

.ph-pkg-name {
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.ph-pkg:hover .ph-pkg-name {
  color: var(--vp-c-brand-1);
}

.ph-pkg-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.ph-pkg-version {
  font-family: var(--vp-font-family-mono);
  font-size: 0.65rem;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

.ph-pkg-badge {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ph-pkg[data-status="beta"] .ph-pkg-badge {
  background: rgba(109, 91, 189, 0.12);
  color: var(--vp-c-brand-1);
}

.ph-pkg[data-status="alpha"] .ph-pkg-badge {
  background: rgba(251, 191, 36, 0.12);
  color: #d97706;
}

@media (max-width: 960px) {
  .ph-pkgs {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .ph-pkgs {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
