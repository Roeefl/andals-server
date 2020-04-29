import Vue from 'vue';
import VueRouter from 'vue-router';
import Monitor from '../views/Monitor';

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Monitor',
    component: Monitor
  }
];

const router = new VueRouter({
  routes
});

export default router;
