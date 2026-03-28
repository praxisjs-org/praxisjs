<script setup lang="ts">
import { useData } from "vitepress";

const { theme } = useData();
const version = theme.value.version as string;
</script>

<template>
  <section class="ph-hero">
    <div class="ph-hero-bg" aria-hidden="true">
      <div class="ph-blob ph-blob-1" />
      <div class="ph-blob ph-blob-2" />
      <div class="ph-grid" />
    </div>

    <div class="ph-container ph-hero-inner">
      <div class="ph-hero-copy">
        <a class="ph-badge" href="/guide/project-status">
          <span class="ph-badge-dot" />
          v{{ version }} &nbsp;&middot;&nbsp; Early Beta
        </a>

        <h1 class="ph-headline">
          The TypeScript framework<br />
          that renders <span class="ph-gradient">exactly once.</span>
        </h1>

        <p class="ph-sub">
          Fine-grained signals. Class components with decorators. No virtual
          DOM, no re-renders, no magic.
        </p>

        <div class="ph-ctas">
          <a href="/guide/getting-started" class="ph-btn ph-btn-primary">
            Get Started
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 8h10m-4-4 4 4-4 4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </a>
          <a href="/guide/introduction" class="ph-btn ph-btn-ghost">
            What is PraxisJS?
          </a>
        </div>

        <div class="ph-pills">
          <span class="ph-pill">No Virtual DOM</span>
          <span class="ph-pill">TypeScript-first</span>
          <span class="ph-pill">Decorator API</span>
          <span class="ph-pill">Signals</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ph-hero {
  position: relative;
  padding: calc(var(--vp-nav-height, 64px) + 4rem) 0 5rem;
  overflow: hidden;
}

.ph-hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.ph-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
}

.ph-blob-1 {
  width: 55vw;
  height: 55vw;
  max-width: 640px;
  max-height: 640px;
  top: -25%;
  left: -8%;
  background: radial-gradient(
    circle,
    rgba(109, 91, 189, 0.15) 0%,
    transparent 70%
  );
}

.ph-blob-2 {
  width: 40vw;
  height: 40vw;
  max-width: 480px;
  max-height: 480px;
  top: 5%;
  right: -5%;
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.1) 0%,
    transparent 70%
  );
}

.ph-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
    circle,
    rgba(109, 91, 189, 0.14) 1px,
    transparent 1px
  );
  background-size: 34px 34px;
  mask-image: radial-gradient(
    ellipse 90% 70% at 50% 30%,
    black 20%,
    transparent 100%
  );
}

.dark .ph-grid {
  background-image: radial-gradient(
    circle,
    rgba(155, 144, 230, 0.09) 1px,
    transparent 1px
  );
}

.ph-hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.75rem;
}

.ph-hero-copy {
  display: contents;
}

.ph-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  border: 1px solid rgba(109, 91, 189, 0.3);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: all 0.2s;
  letter-spacing: 0.02em;
}
.ph-badge:hover {
  border-color: var(--vp-c-brand-1);
  background: rgba(109, 91, 189, 0.18);
}

.ph-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px rgba(109, 91, 189, 0.3);
  animation: ph-pulse 2.5s ease-in-out infinite;
}

@keyframes ph-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 2px rgba(109, 91, 189, 0.3);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(109, 91, 189, 0.1);
  }
}

.ph-headline {
  font-size: clamp(2.2rem, 3.5vw, 3.2rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--vp-c-text-1);
  margin: 0;
}

.ph-gradient {
  background: linear-gradient(
    120deg,
    #9b76ff 0%,
    #7c6dd6 25%,
    #6366f1 50%,
    #c084fc 75%,
    #9b76ff 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ph-shimmer 5s linear infinite;
}

@keyframes ph-shimmer {
  0% {
    background-position: 0% center;
  }
  100% {
    background-position: 200% center;
  }
}

.ph-sub {
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  margin: 0;
}

.ph-ctas {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.ph-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.35rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.ph-btn-primary {
  background: var(--vp-c-brand-1);
  color: #fff;
  border: 1px solid transparent;
  box-shadow: 0 2px 8px rgba(109, 91, 189, 0.35);
}
.ph-btn-primary:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(109, 91, 189, 0.5);
  color: #fff;
}

.ph-btn-ghost {
  background: transparent;
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-border);
}
.ph-btn-ghost:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
  transform: translateY(-1px);
}

.ph-pills {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.ph-pill {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  letter-spacing: 0.01em;
}

/* ── Right column — flat code block ────────────────────────────── */
.ph-hero-code {
  border-radius: 12px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  overflow: hidden;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.05),
    0 8px 28px rgba(0, 0, 0, 0.07);
}

.dark .ph-hero-code {
  background: #0d0b19;
  border-color: rgba(155, 144, 230, 0.16);
  box-shadow:
    0 8px 40px rgba(0, 0, 0, 0.3),
    0 0 50px rgba(109, 91, 189, 0.04);
}

.ph-code {
  display: block;
  margin: 0;
  padding: 1.5rem 1.6rem 1.2rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
  line-height: 1.9;
  color: #c9c5e8;
  background: transparent;
  white-space: pre;
  overflow-x: auto;
}

.dark .ph-code {
  color: #d4d0f0;
}

:deep(.hl-dec) {
  color: #c084fc;
  font-weight: 600;
}
:deep(.hl-kw) {
  color: #818cf8;
}
:deep(.hl-cls) {
  color: #f9a8d4;
}
:deep(.hl-type) {
  color: #67e8f9;
}
:deep(.hl-str) {
  color: #86efac;
}
:deep(.hl-num) {
  color: #fbbf24;
}
:deep(.hl-react) {
  color: #38bdf8;
  font-weight: 600;
}
:deep(.hl-th) {
  color: #c084fc;
}
:deep(.hl-fn) {
  color: #94a3b8;
}
:deep(.hl-attr) {
  color: #7dd3fc;
}

.ph-code-label {
  padding: 0.4rem 1rem;
  border-top: 1px solid var(--vp-c-border);
  font-family: var(--vp-font-family-mono);
  font-size: 0.65rem;
  color: var(--vp-c-text-3);
  text-align: right;
}

.dark .ph-code-label {
  border-color: rgba(155, 144, 230, 0.1);
}

/* ── Responsive ────────────────────────────────────────────────── */
@media (max-width: 960px) {
  .ph-hero-inner {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }

  .ph-hero {
    padding-top: calc(var(--vp-nav-height, 64px) + 3rem);
  }
}

@media (max-width: 600px) {
  .ph-hero {
    padding-top: calc(var(--vp-nav-height, 64px) + 2rem);
    padding-bottom: 3.5rem;
  }

  .ph-btn {
    width: 100%;
    justify-content: center;
  }

  .ph-ctas {
    flex-direction: column;
  }
}
</style>
