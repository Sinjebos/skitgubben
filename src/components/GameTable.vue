<template>
  <div class="table-section">
    <div class="pile-area">
      <div class="pile-info">
        <div v-if="topCard" class="top-card">
          <Card
            :value="topCard.value"
            :suit="topCard.suit"
            :disabled="true"
          />
        </div>
        <div class="counts">
          <div>Hög: {{ pileCount }}</div>
          <div>Kortlek: {{ deckCount }}</div>
        </div>
      </div>
    </div>

    <div class="table-cards">
      <div class="face-up-cards">
        <Card
          v-for="(card, index) in tableCardsUp"
          :key="index"
          :value="card.value"
          :suit="card.suit"
          :selected="selectedTableCards.includes(index)"
          :disabled="!canPlayTableCard(card)"
          @card-click="() => handleCardClick(index)"
        />
      </div>
      <div class="face-down-cards">
        <Card
          v-for="(card, index) in tableCardsDown"
          :key="index"
          :value="'?'"
          :suit="''"
          :face-down="true"
          :disabled="true"
        />
      </div>
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
  topCard: CardType | null
  pileCount: number
  deckCount: number
  tableCardsUp: CardType[]
  tableCardsDown: CardType[]
  selectedTableCards: number[]
  canPlayTableCard: (card: CardType) => boolean
}

const props = withDefaults(defineProps<Props>(), {
  topCard: null,
  pileCount: 0,
  deckCount: 0,
  tableCardsUp: () => [],
  tableCardsDown: () => [],
  selectedTableCards: () => []
})

const emit = defineEmits<{
  (e: 'card-click', index: number): void
}>()

const handleCardClick = (index: number) => {
  emit('card-click', index)
}
</script>

<style scoped>
.table-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.pile-area {
  display: flex;
  justify-content: center;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.pile-info {
  display: flex;
  gap: 20px;
  align-items: center;
}

.counts {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #fff;
  font-size: 0.9em;
}

.table-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.face-up-cards,
.face-down-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 10px;
  min-height: 70px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

h3 {
  color: #fff;
  font-size: 1em;
  margin: 0;
}
</style> 