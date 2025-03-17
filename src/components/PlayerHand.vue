<template>
  <div class="player-section">
    <h3>Din hand</h3>
    <div class="cards-container">
      <Card
        v-for="(card, index) in cards"
        :key="index"
        :value="card.value"
        :suit="card.suit"
        :selected="selectedCards.includes(index)"
        :disabled="isCardDisabled(card)"
        @card-click="() => handleCardClick(index)"
      />
    </div>
    <div class="action-buttons">
      <button
        v-if="showDrawButton"
        @click="$emit('draw-card')"
        :disabled="!canDrawCard"
      >
        Dra kort
      </button>
      <button
        v-if="selectedCards.length > 0"
        @click="$emit('play-cards')"
      >
        Spela valda kort
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Card from './Card.vue'

interface CardType {
  value: string
  suit: string
}

interface Props {
  cards: CardType[]
  selectedCards: number[]
  currentRank: string
  canDrawCard: boolean
  showDrawButton: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedCards: () => [],
  currentRank: '',
  canDrawCard: false,
  showDrawButton: true
})

const emit = defineEmits<{
  (e: 'card-click', index: number): void
  (e: 'draw-card'): void
  (e: 'play-cards'): void
}>()

const isCardDisabled = (card: CardType): boolean => {
  if (!props.currentRank || card.value === '2' || card.value === '10') {
    return false
  }
  return card.value !== props.currentRank
}

const handleCardClick = (index: number) => {
  emit('card-click', index)
}
</script>

<style scoped>
.player-section {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.cards-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 10px;
  min-height: 100px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;

}

.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  text-align: center;
}

h3 {
  color: #fff;
  font-size: 1em;
  margin: 0;
}
</style> 