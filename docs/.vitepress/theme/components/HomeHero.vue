<script setup lang="ts">
import { v } from "../../versions";
const version = v("@praxisjs/core");
</script>

<template>
  <section class="ph-hero">
    <div class="ph-hero-bg" aria-hidden="true">
      <div class="ph-blob ph-blob-1" />
      <div class="ph-blob ph-blob-2" />
      <div class="ph-grid" />
    </div>

    <div class="ph-container ph-hero-inner">
      <!-- Copy -->
      <div class="ph-copy">
        <a class="ph-badge" href="/guide/project-status">
          <span class="ph-badge-dot" />
          v{{ version }} &nbsp;·&nbsp; Stable
        </a>

        <h1 class="ph-headline">
          Update exactly<br />
          <span class="ph-gradient">what changed.</span>
        </h1>

        <p class="ph-sub">
          Signals connect state directly to the DOM nodes that depend on it. No
          virtual DOM. No component re-renders. No guesswork.
        </p>

        <div class="ph-install">
          <span class="ph-install-prompt">$</span>
          <code class="ph-install-cmd">npm create praxisjs@latest</code>
        </div>

        <div class="ph-ctas">
          <a href="/guide/getting-started" class="ph-btn ph-btn-primary">
            Get started
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
          <a href="/guide/introduction" class="ph-btn ph-btn-ghost"
            >Why PraxisJS?</a
          >
        </div>

        <div class="ph-pills">
          <span class="ph-pill">No Virtual DOM</span>
          <span class="ph-pill">TypeScript-first</span>
          <span class="ph-pill">Decorator API</span>
          <span class="ph-pill">Fine-grained signals</span>
        </div>
      </div>

      <!-- Logo -->
      <div class="ph-logo-wrap" aria-hidden="true">
        <img src="/logo.svg" alt="" class="ph-logo" />
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────── */
.ph-hero {
  position: relative;
  padding: calc(var(--vp-nav-height, 64px) + 4rem) 0 5rem;
  overflow: hidden;
}

.ph-hero-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

/* ── Background ──────────────────────────────────────────────────── */
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

/* ── Copy ────────────────────────────────────────────────────────── */
.ph-copy {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: flex-start;
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
  font-size: clamp(2.4rem, 3.8vw, 3.6rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.035em;
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
  max-width: 42ch;
}

.ph-install {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  width: fit-content;
}

.ph-install-prompt {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  user-select: none;
}

.ph-install-cmd {
  color: var(--vp-c-text-1);
  font-family: inherit;
  background: none;
  padding: 0;
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

/* ── Logo ────────────────────────────────────────────────────────── */
.ph-logo-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
}

.ph-logo {
  width: 250px;
  height: 250px;
  animation: ph-float 6s ease-in-out infinite;
  filter: drop-shadow(0 0 48px rgba(109, 91, 189, 0.35));
}

@keyframes ph-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-14px);
  }
}

/* ── Responsive ──────────────────────────────────────────────────── */
@media (max-width: 960px) {
  .ph-hero-inner {
    grid-template-columns: 1fr;
    gap: 3rem;
    text-align: center;
  }

  .ph-logo-wrap {
    order: -1;
  }

  .ph-copy {
    align-items: center;
  }

  .ph-sub {
    max-width: 52ch;
  }

  .ph-viz {
    justify-content: center;
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
    width: 100%;
  }

  .ph-viz-card {
    width: 290px;
    height: 270px;
  }
}
</style>
