import { StateRegistry } from '@uirouter/angularjs';
import angular from 'angular';

import { ContainersViewAngular } from './ContainersView/ContainersView';
import { ContainersDatatableAngular } from './ContainersView/ContainersDatatable';

export default angular
  .module('portainer.docker.containers', [])
  .component('containersView', ContainersViewAngular)
  .component('containersDatatable', ContainersDatatableAngular)
  .config(config).name;

/* @ngInject */
function config($stateRegistryProvider: StateRegistry) {
  $stateRegistryProvider.register({
    name: 'docker.containers',
    url: '/containers',
    views: {
      'content@': {
        component: 'containersView',
      },
    },
  });

  $stateRegistryProvider.register({
    name: 'docker.containers.container',
    url: '/:id?nodeName',
    views: {
      'content@': {
        templateUrl: '../views/containers/edit/container.html',
        controller: 'ContainerController',
      },
    },
  });

  $stateRegistryProvider.register({
    name: 'docker.containers.container.attach',
    url: '/attach',
    views: {
      'content@': {
        templateUrl: '../views/containers/console/attach.html',
        controller: 'ContainerConsoleController',
      },
    },
  });

  $stateRegistryProvider.register({
    name: 'docker.containers.container.exec',
    url: '/exec',
    views: {
      'content@': {
        templateUrl: '../views/containers/console/exec.html',
        controller: 'ContainerConsoleController',
      },
    },
  });

  $stateRegistryProvider.register({
    name: 'docker.containers.new',
    url: '/new?nodeName&from',
    views: {
      'content@': {
        templateUrl: '../views/containers/create/createcontainer.html',
        controller: 'CreateContainerController',
      },
    },
  });

  $stateRegistryProvider.register({
    name: 'docker.containers.container.inspect',
    url: '/inspect',
    views: {
      'content@': {
        templateUrl: '../views/containers/inspect/containerinspect.html',
        controller: 'ContainerInspectController',
      },
    },
  });

  $stateRegistryProvider.register({
    name: 'docker.containers.container.logs',
    url: '/logs',
    views: {
      'content@': {
        templateUrl: '../views/containers/logs/containerlogs.html',
        controller: 'ContainerLogsController',
      },
    },
  });

  $stateRegistryProvider.register({
    name: 'docker.containers.container.stats',
    url: '/stats',
    views: {
      'content@': {
        templateUrl: '../views/containers/stats/containerstats.html',
        controller: 'ContainerStatsController',
      },
    },
  });
}
