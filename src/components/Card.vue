<template>
  <div
    :class="[
      'card',
      { 'card-red': isRed, 'card-selected': selected, 'card-disabled': disabled }
    ]"
    @click="handleClick"
  >
    <div class="card-content">
      {{ faceDown ? '?' : value + suit }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  value: string
  suit: string
  selected?: boolean
  faceDown?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  faceDown: false,
  disabled: false
})

const isRed = computed(() => ['♥', '♦'].includes(props.suit))

const emit = defineEmits<{
  (e: 'cardClick'): void
}>()

const handleClick = () => {
  if (!props.disabled) {
    emit('cardClick')
  }
}
</script>

<style scoped>
.card {
  width: 40px;
  height: 60px;
  border: 1px solid #ccc;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: white;
  color: black;
  cursor: pointer;
  user-select: none;
  transition: transform 0.1s, box-shadow 0.1s;
}

.card:hover:not(.card-disabled) {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.card-red {
  color: red;
}

.card-selected {
  border: 2px solid #4CAF50;
  transform: translateY(-4px);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
}

.card-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.card-content {
  font-size: 1.2em;
  font-weight: bold;
}
</style> 