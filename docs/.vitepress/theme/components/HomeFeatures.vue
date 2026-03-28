<script setup lang="ts">
const steps = [
  {
    n: '01',
    title: 'Define state with decorators',
    desc: 'Annotate class fields with @State, @Prop or @Resource. Each decorator registers a signal under the hood — no stores, no context, no setup functions.',
    href: '/decorators/state',
  },
  {
    n: '02',
    title: 'Bind reactivity in JSX',
    desc: 'Wrap any expression in an arrow function — {() => this.count}. PraxisJS tracks which signals are read and subscribes that exact DOM node to future updates.',
    href: '/essentials/reactivity',
  },
  {
    n: '03',
    title: 'Only the right nodes update',
    desc: 'When a signal changes, only the DOM nodes that read it re-evaluate. render() never runs again. No virtual DOM, no diffing, no component tree traversal.',
    href: '/essentials/components',
  },
]
</script>

<template>
  <section class="ph-how">
    <div class="ph-container">
      <div class="ph-how-header">
        <h2>How reactivity works</h2>
        <p>Three steps. No magic.</p>
      </div>
      <div class="ph-how-steps">
        <a
          v-for="s in steps"
          :key="s.n"
          :href="s.href"
          class="ph-step"
        >
          <span class="ph-step-n">{{ s.n }}</span>
          <div class="ph-step-body">
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ph-how {
  padding: 5rem 0;
  border-top: 1px solid var(--vp-c-border);
}

.ph-how-header {
  margin-bottom: 3rem;
}

.ph-how-header h2 {
  font-size: clamp(1.6rem, 2.5vw, 2.1rem);
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 0.4rem;
  letter-spacing: -0.02em;
}

.ph-how-header p {
  font-size: 1rem;
  color: var(--vp-c-text-3);
  margin: 0;
}

/* ── Steps ───────────────────────────────────────────────────────── */
.ph-how-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  overflow: hidden;
}

.ph-step {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem;
  text-decoration: none;
  border-right: 1px solid var(--vp-c-border);
  transition: background 0.2s;
  position: relative;
}

.ph-step:last-child {
  border-right: none;
}

.ph-step:hover {
  background: var(--vp-c-bg-soft);
}

.ph-step:hover .ph-step-n {
  color: var(--vp-c-brand-1);
}

.ph-step-n {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--vp-c-text-3);
  transition: color 0.2s;
}

.ph-step-body h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 0.6rem;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.ph-step-body p {
  font-size: 0.85rem;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  margin: 0;
}

/* ── Responsive ──────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .ph-how-steps {
    grid-template-columns: 1fr;
  }

  .ph-step {
    border-right: none;
    border-bottom: 1px solid var(--vp-c-border);
  }

  .ph-step:last-child {
    border-bottom: none;
  }
}
</style>
