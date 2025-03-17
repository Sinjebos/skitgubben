<template>
  <div class="opponents-section">
    <h3>Andra spelare</h3>
    <div class="opponents-list">
      <div
        v-for="player in opponents"
        :key="player.id"
        :class="['player-info', { current: player.id === currentPlayerId }]"
      >
        <div class="player-name">
          {{ player.name }} {{ player.ready ? '(Redo)' : '(Inte redo)' }}
        </div>
        <div class="cards-info">
          Hand: {{ player.handSize }} kort<br>
          Synliga kort: {{ player.tableCardsUpCount }}<br>
          Dolda kort: {{ player.tableCardsDownCount }}
        </div>
        <div class="opponent-table-cards">
          <Card
            v-for="(card, index) in player.tableCardsUp"
            :key="index"
            :value="card.value"
            :suit="card.suit"
            :disabled="true"
          />
        </div>
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

interface Player {
  id: string
  name: string
  ready: boolean
  handSize: number
  tableCardsUpCount: number
  tableCardsDownCount: number
  tableCardsUp: CardType[]
}

interface Props {
  opponents: Player[]
  currentPlayerId: string
}

withDefaults(defineProps<Props>(), {
  opponents: () => [],
  currentPlayerId: ''
})
</script>

<style scoped>
.opponents-section {
  grid-column: 1;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 100%;
  overflow-y: auto;
}

.opponents-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  
}

.player-info {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 10px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.player-info.current {
  background-color: rgba(76, 175, 80, 0.2);
  border: 1px solid #4CAF50;
}

.player-name {
  font-weight: bold;
  color: #fff;
}

.cards-info {
  font-size: 0.9em;
  color: rgba(255, 255, 255, 0.8);
}

.opponent-table-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

h3 {
  color: #fff;
  font-size: 1em;
  margin: 0;
}
</style> 