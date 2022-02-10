import _ from 'lodash';

import { ResourceControlViewModel } from '@/portainer/access-control/models/ResourceControlViewModel';

import {
  DockerContainer,
  DockerContainerResponse,
  DockerContainerStatus,
} from './types';

export function parseViewModel(
  response: DockerContainerResponse
): DockerContainer {
  const resourceControl =
    response.Portainer?.ResourceControl &&
    new ResourceControlViewModel(response?.Portainer?.ResourceControl);
  const nodeName = response.Portainer?.Agent?.NodeName || '';

  const ip =
    Object.values(response?.NetworkSettings?.Networks || {})[0]?.IPAddress ||
    '';

  const labels = response.Labels || {};
  const stackName =
    labels['com.docker.compose.project'] ||
    labels['com.docker.stack.namespace'];

  const status = createStatus(response.Status);

  const ports = _.compact(
    response.Ports?.map(
      (p) =>
        p.PublicPort && {
          host: p.IP,
          private: p.PrivatePort,
          public: p.PublicPort,
        }
    )
  );

  return {
    ...response,
    ResourceControl: resourceControl,
    NodeName: nodeName,
    IP: ip,
    StackName: stackName,
    Status: status,
    Ports: ports,
  };
}

function createStatus(statusText = ''): DockerContainerStatus {
  const status = statusText.toLowerCase();

  if (status.includes('paused')) {
    return 'paused';
  }

  if (status.includes('dead')) {
    return 'dead';
  }

  if (status.includes('created')) {
    return 'created';
  }

  if (status.includes('exited')) {
    return 'stopped';
  }

  if (status.includes('(healthy)')) {
    return 'healthy';
  }

  if (status.includes('(unhealthy)')) {
    return 'unhealthy';
  }

  if (status.includes('(health: starting)')) {
    return 'starting';
  }

  return 'running';
}
