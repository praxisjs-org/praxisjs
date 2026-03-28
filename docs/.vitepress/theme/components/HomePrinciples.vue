<script setup lang="ts">
const principles = [
  {
    symbol: '1×',
    title: 'Render once',
    desc: 'render() is called exactly once per mount. Reactive updates happen via arrow functions in JSX — {() => this.value} — never via re-renders.',
  },
  {
    symbol: '@',
    title: 'Explicit by design',
    desc: 'Decorators make reactivity visible at a glance. You see @State, @Watch, @Computed in the class definition — no hooks, no magic strings.',
  },
  {
    symbol: '△',
    title: 'No virtual DOM',
    desc: 'Signals update specific DOM nodes directly via effects. Skip reconciliation entirely — only the exact nodes that depend on a signal update.',
  },
]
</script>

<template>
  <section class="ph-principles">
    <div class="ph-container">
      <div class="ph-principles-header">
        <h2>Design principles</h2>
        <p>The ideas behind every decision in PraxisJS.</p>
      </div>
      <div class="ph-principles-grid">
        <div v-for="p in principles" :key="p.title" class="ph-principle">
          <div class="ph-principle-icon" aria-hidden="true">{{ p.symbol }}</div>
          <h3>{{ p.title }}</h3>
          <p>{{ p.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ph-principles {
  padding: 5rem 0;
  background: var(--vp-c-bg-alt);
  border-top: 1px solid var(--vp-c-border);
  border-bottom: 1px solid var(--vp-c-border);
}

.dark .ph-principles {
  background: #0d0b1a;
}

.ph-principles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.ph-principles-header {
  margin-bottom: 2.5rem;
}

.ph-principles-header h2 {
  font-size: clamp(1.6rem, 2.5vw, 2.1rem);
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 0.4rem;
  letter-spacing: -0.02em;
}

.ph-principles-header p {
  font-size: 1rem;
  color: var(--vp-c-text-3);
  margin: 0;
}

.ph-principle {
  padding: 2rem;
  border-radius: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  transition: border-color 0.2s, transform 0.2s;
}
.ph-principle:hover {
  border-color: rgba(109, 91, 189, 0.4);
  transform: translateY(-2px);
}

.ph-principle-icon {
  font-size: 1.75rem;
  font-weight: 800;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
  margin-bottom: 1rem;
  display: block;
  letter-spacing: -0.02em;
  opacity: 0.8;
}

.ph-principle h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 0.6rem;
  letter-spacing: -0.01em;
}

.ph-principle p {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  margin: 0;
}

@media (max-width: 960px) {
  .ph-principles-grid {
    grid-template-columns: 1fr;
    max-width: 520px;
    margin: 0 auto;
  }
}
</style>
