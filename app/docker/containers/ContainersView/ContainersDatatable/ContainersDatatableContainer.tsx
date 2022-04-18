import {
  TableSettingsProvider,
  useTableSettings,
} from '@/portainer/components/datatables/components/useTableSettings';
import { Environment } from '@/portainer/environments/types';
import { r2a } from '@/react-tools/react2angular';

import { Filters } from '../../containers.service';
import { ContainersTableSettings, DockerContainer } from '../../types';
import { useContainers } from '../../queries';

import {
  ContainersDatatable,
  Props as ContainerDatatableProps,
} from './ContainersDatatable';

interface Props
  extends Omit<ContainerDatatableProps, 'containers' | 'tableKey'> {
  filters?: Filters;
  tableKey?: string;
}

export function ContainersDatatableContainer({
  tableKey = 'containers',
  environment,
  filters,
  isRefreshVisible,
  ...props
}: Props) {
  const defaultSettings = {
    autoRefreshRate: 0,
    truncateContainerName: 32,
    hiddenQuickActions: [],
    hiddenColumns: [],
    pageSize: 10,
    sortBy: { id: 'state', desc: false },
  };

  return (
    <TableSettingsProvider defaults={defaultSettings} storageKey={tableKey}>
      <ContainersLoader
        environment={environment}
        filters={filters}
        isRefreshVisible={isRefreshVisible}
      >
        {(containers) => (
          <ContainersDatatable
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            containers={containers}
            isRefreshVisible={isRefreshVisible}
            environment={environment}
            tableKey={tableKey}
          />
        )}
      </ContainersLoader>
    </TableSettingsProvider>
  );
}

interface ContainersLoaderProps {
  environment: Environment;
  filters?: Filters;
  isRefreshVisible: boolean;
  children: (containers: DockerContainer[]) => React.ReactNode;
}

function ContainersLoader({
  environment,
  filters,
  isRefreshVisible,
  children,
}: ContainersLoaderProps) {
  const { settings } = useTableSettings<ContainersTableSettings>();

  const containersQuery = useContainers(
    environment.Id,
    true,
    filters,
    isRefreshVisible ? settings.autoRefreshRate * 1000 : undefined
  );

  if (!containersQuery.data) {
    return null;
  }

  return <>{children(containersQuery.data)}</>;
}

export const ContainersDatatableAngular = r2a(ContainersDatatableContainer, [
  'isAddActionVisible',
  'isHostColumnVisible',
  'isRefreshVisible',
  'tableKey',
  'environment',
  'filters',
]);
