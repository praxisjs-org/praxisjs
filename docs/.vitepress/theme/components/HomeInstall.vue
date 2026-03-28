<script setup lang="ts">
import { ref } from 'vue'

const copied = ref(false)

async function copyInstall() {
  try {
    await navigator.clipboard.writeText('npm create praxisjs@latest')
    copied.value = true
    setTimeout(() => { copied.value = false }, 2200)
  } catch {}
}
</script>

<template>
  <section class="ph-install">
    <div class="ph-install-bg" aria-hidden="true">
      <div class="ph-blob ph-blob-install-1" />
      <div class="ph-blob ph-blob-install-2" />
    </div>
    <div class="ph-container ph-install-inner">
      <div class="ph-install-eyebrow">Quick Start</div>
      <h2>Start in seconds</h2>
      <p>Scaffold a new project with the official CLI or follow the manual setup guide.</p>

      <div class="ph-cmd" role="group" aria-label="Install command">
        <span class="ph-cmd-prompt" aria-hidden="true">$</span>
        <code class="ph-cmd-text">npm create praxisjs@latest</code>
        <button
          class="ph-copy"
          :class="{ copied }"
          @click="copyInstall"
          :aria-label="copied ? 'Copied to clipboard' : 'Copy install command'"
        >
          <svg v-if="!copied" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
        </button>
      </div>

      <div class="ph-install-links">
        <a href="/guide/getting-started" class="ph-btn ph-btn-primary">
          Read the docs
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <a href="https://github.com/praxisjs-org/praxisjs" class="ph-btn ph-btn-ghost" target="_blank" rel="noopener noreferrer">
          View on GitHub
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ph-install {
  position: relative;
  padding: 7rem 0;
  text-align: center;
  overflow: hidden;
}

.ph-install-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ph-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
}

.ph-blob-install-1 {
  width: 50vw;
  height: 50vw;
  max-width: 600px;
  max-height: 600px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(109, 91, 189, 0.12) 0%, transparent 70%);
}

.ph-blob-install-2 {
  width: 30vw;
  height: 30vw;
  max-width: 350px;
  max-height: 350px;
  top: 20%;
  right: 10%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
}

.ph-install-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.ph-install-eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.ph-install h2 {
  font-size: clamp(2rem, 3.5vw, 2.75rem);
  font-weight: 800;
  color: var(--vp-c-text-1);
  margin: 0;
  letter-spacing: -0.03em;
}

.ph-install p {
  font-size: 1.05rem;
  color: var(--vp-c-text-2);
  margin: 0;
  max-width: 420px;
}

.ph-cmd {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  border-radius: 10px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  margin: 0.5rem 0;
}

.dark .ph-cmd {
  background: #0d0b19;
  border-color: rgba(155, 144, 230, 0.2);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
}

.ph-cmd-prompt {
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
  color: var(--vp-c-brand-1);
  font-weight: 700;
  user-select: none;
}

.ph-cmd-text {
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
  background: none;
  border: none;
  padding: 0;
}

.ph-copy {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.ph-copy:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.ph-copy.copied {
  background: rgba(14, 165, 122, 0.1);
  border-color: rgba(14, 165, 122, 0.3);
  color: #0ea57a;
}

.ph-install-links {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.5rem;
}

/* Buttons — needed here since ph-btn is used in this component */
.ph-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.4rem;
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

@media (max-width: 600px) {
  .ph-cmd {
    flex-wrap: wrap;
    justify-content: center;
    max-width: 320px;
  }

  .ph-btn {
    width: 100%;
    justify-content: center;
  }

  .ph-install-links {
    flex-direction: column;
    width: 100%;
    max-width: 280px;
  }
}
</style>
