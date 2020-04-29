<template>
  <div class="rooms">
    <h1 class="header">
      Rooms List
    </h1>
    <ul class="rooms-list">
      <li class="room-item room-header">
        <span v-for="(column, c) in columns" :key="c">
          {{ column }}
        </span>
      </li>
      <li v-for="(room, r) in rooms" :key="r" class="room-item">
        <span v-for="(column, c) in columns" :key="`room-${r}-column-${c}`">
          {{ room[column] }}
        </span>
        <button
          v-for="({ name }, a) in actions"
          :key="`room-${r}-action-${a}`"
          @click="onAction(r)"
          class="room-action"
        >
          {{ name }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
  const actions = [];

  export default {
    name: 'RoomsList',
    props: {
      columns: {
        type: Array,
        default: () => []
      },
      rooms: {
        type: Array,
        default: () => []
      }
    },
    created() {
      this.actions = actions
    },
    methods: {
      onAction: function(roomIndex) {
        console.log("onAction -> roomIndex", roomIndex)
      }
    }
  }
</script>

<style scoped lang="scss">
  $spacer: 1rem;
  $item-height: 70px;

  $primary: #CFD8DC;
  $secondary: #212121;
  $info: #9FA8DA;
  $success: #5C6BC0;
  $error: #AD1457;
  $warning: #E57373;
  
  .rooms {
    padding: $spacer;

    .header {
      font-weight: 700;
    }

    .rooms-list {
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;

      .room-item {
        height: $item-height;
        display: grid;
        grid-gap: 1%;
        grid-template-columns: repeat(10, 9%);
        place-items: center center;

        &:nth-child(odd) {
          background: $secondary;
          color: $primary;
        }
        &:nth-child(even) {
          background: $info;
        }

        &.room-header {
          height: $item-height / 2;
          background: $secondary;
          color: $primary;
        }

      }
    }
  }
</style>
