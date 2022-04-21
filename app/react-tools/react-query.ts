import {
  MutationCache,
  MutationOptions,
  QueryCache,
  QueryClient,
} from 'react-query';

import { notifyError } from '@/portainer/services/notifications';

export function withError(fallbackMessage?: string, title = 'Failure') {
  return {
    meta: {
      message: fallbackMessage,
      title,
    },
  };
}

export function withInvalidate(
  queryClient: QueryClient,
  queryKeysToInvalidate: string[][]
) {
  return {
    onSuccess() {
      queryKeysToInvalidate.forEach((keys) => {
        queryClient.invalidateQueries(keys);
      });
    },
  };
}

export function mutationOptions<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
>(...options: MutationOptions<TData, TError, TVariables, TContext>[]) {
  return options.reduce(
    (acc, option) => ({
      ...acc,
      ...option,
    }),
    {}
  );
}

export function createQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, variable, context, mutation) => {
        handleError(error, mutation.meta?.error);
      },
    }),
    queryCache: new QueryCache({
      onError: (error, mutation) => {
        handleError(error, mutation.meta?.error);
      },
    }),
  });
}

function handleError(error: unknown, errorMeta?: unknown) {
  if (errorMeta && typeof errorMeta === 'object') {
    const { title = 'Failure', message } = errorMeta as {
      title?: string;
      message?: string;
    };

    notifyError(title, error as Error, message);
  }
}
