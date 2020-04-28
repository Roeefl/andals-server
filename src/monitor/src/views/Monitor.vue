<template>
  <main class="monitor">
    <RoomsList :columns="columns" :rooms="rooms" />
  </main>
</template>

<script>
  import { mapState } from 'vuex'
  import apiService from '@/services/api';
  import RoomsList from '@/components/RoomsList';

  export default {
    name: 'Monitor',
    components: {
      RoomsList
    },
    computed: mapState([
      'rooms'
    ]),
    data: () => ({
      autoRefresh: null,
      columns: []
    }),
    async created() {
      this.fetchRooms();
    },
    mounted() {
      this.autoRefresh = setInterval(
        () => this.fetchRooms(),
        10 * 1000
      );
    },
    destroyed: function() {
      clearInterval(this.autoRefresh);
    },
    methods: {
      fetchRooms: async function() {
        const serverState = await apiService.serverState();

        const {
          columns,
          connections,
          cpu,
          memory,
          rooms
        } = serverState;
        
        this.columns = columns;

        this.$store.commit('setRooms', rooms);
      }
    }
  }
</script>
