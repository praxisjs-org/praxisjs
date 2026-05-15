<script setup lang="ts">
const base = (import.meta.env.VITE_STORYBOOK_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:6006";

const props = defineProps<{
  story: string;
  label?: string;
}>();

const href = `${base}/?path=/story/${props.story}`;
</script>

<template>
  <a :href="href" target="_blank" rel="noopener noreferrer" class="storybook-link">
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 12.5h11V1.5H1.5v11z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M5 5l4 4M9 5L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    {{ label ?? "View in Storybook" }}
  </a>
</template>

<style scoped>
.storybook-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.storybook-link:hover {
  background: var(--vp-c-brand-1);
  color: #fff;
}
</style>
