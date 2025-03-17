<script setup>
import Game from './components/Game.vue'
</script>

<template>
  <div class="app">
    <Game />
  </div>
</template>

<style>
:root {
  --background-color: #1a1a1a;
  --text-color: #ffffff;
  --primary-color: #4CAF50;
  --secondary-color: #2196F3;
  --error-color: #f44336;
  --success-color: #4CAF50;
  --warning-color: #ff9800;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
  line-height: 1.6;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

button {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  transition: background-color 0.2s, transform 0.1s;
}

button:hover {
  filter: brightness(1.1);
}

button:active {
  transform: scale(0.98);
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

input {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

input:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--primary-color);
}
</style>
