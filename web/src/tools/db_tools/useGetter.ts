import { useQuery } from '@tanstack/react-query'
import { getter } from './getter'

export function useGetter<T>(queryKey: (string | undefined)[], retry?: number | boolean) {
    const res = useQuery({
        queryKey: queryKey,
        queryFn: async () => await getter<T>(queryKey.join('/')),
        enabled: queryKey.every((section) => !!section),
        retry: retry,
    })

    return res
}
