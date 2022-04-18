import { useInfo } from '@/docker/services/system.service';
import { PageHeader } from '@/portainer/components/PageHeader';
import { Environment } from '@/portainer/environments/types';
import { isAgentEnvironment } from '@/portainer/environments/utils';
import { r2a } from '@/react-tools/react2angular';

import { ContainersDatatableContainer } from './ContainersDatatable';

interface Props {
  endpoint: Environment;
}

export function ContainersView({ endpoint: environment }: Props) {
  const isAgent = isAgentEnvironment(environment.Type);

  const envInfoQuery = useInfo(environment.Id, (info) => !!info.Swarm?.NodeID);

  const isSwarmManager = !!envInfoQuery.data;
  const isHostColumnVisible = isAgent && isSwarmManager;
  return (
    <>
      <PageHeader
        title="Container list"
        breadcrumbs={[{ label: 'Containers' }]}
        reload
      />

      <div className="row">
        <div className="col-sm-12">
          <ContainersDatatableContainer
            environment={environment}
            isAddActionVisible
            isRefreshVisible
            isHostColumnVisible={isHostColumnVisible}
          />
        </div>
      </div>
    </>
  );
}

export const ContainersViewAngular = r2a(ContainersView, ['endpoint']);
