import { useMutation, useQuery, useQueryClient } from 'react-query';

import { error as notifyError } from '@/portainer/services/notifications';

import { createTag, getTags } from './tags.service';
import { Tag } from './types';

export function useTags<T = Tag>(select?: (tags: Tag[]) => T[]) {
  const { data, isLoading } = useQuery(['tags'], () => getTags(), {
    staleTime: 50,
    select,
    onError(error) {
      notifyError('Failed loading tags', error as Error);
    },
  });

  return { tags: data, isLoading };
}

export function useCreateTagMutation() {
  const queryClient = useQueryClient();

  return useMutation(createTag, {
    meta: {
      error: {
        message: 'Unable to create tag',
        title: 'Failure',
      },
    },
    onSuccess() {
      queryClient.invalidateQueries(['tags']);
    },
  });
}
