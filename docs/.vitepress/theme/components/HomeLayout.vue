<script setup lang="ts">
import HomeHero from './HomeHero.vue'
import HomePrinciples from './HomePrinciples.vue'
import HomeFeatures from './HomeFeatures.vue'
import HomeEcosystem from './HomeEcosystem.vue'
import HomeInstall from './HomeInstall.vue'
</script>

<template>
  <div class="ph">
    <HomeHero />
    <HomePrinciples />
    <HomeFeatures />
    <HomeEcosystem />
    <HomeInstall />
  </div>
</template>

<style>
/* Shared utilities used across home sub-components */
.ph {
  width: 100%;
  overflow-x: hidden;
  font-family: var(--vp-font-family-base);
}

.ph-container {
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 2rem;
}

@media (max-width: 600px) {
  .ph-container {
    padding: 0 1.25rem;
  }
}
</style>
