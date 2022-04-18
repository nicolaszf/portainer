import { useQuery } from 'react-query';

import { EnvironmentId } from '@/portainer/environments/types';
import { notifyError } from '@/portainer/services/notifications';

import { Filters, getContainers } from './containers.service';

export function useContainers(
  environmentId: EnvironmentId,
  all = true,
  filters?: Filters,
  autoRefreshRate?: number
) {
  return useQuery(
    ['environments', environmentId, 'docker', 'containers', { all, filters }],
    () => getContainers(environmentId, all, filters),
    {
      onError(err) {
        notifyError('Failure', err as Error, 'Unable to retrieve containers');
      },
      refetchInterval() {
        return autoRefreshRate ?? false;
      },
    }
  );
}
