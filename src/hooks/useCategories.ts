import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoryService } from '@/services/categoryService'
import { useAuthStore } from '@/store/authStore'
import type { Category } from '@/types'

export function useCategories() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: () => categoryService.getAll(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 min
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (cat: Omit<Category, 'id' | 'user_id'>) =>
      categoryService.create(user!.id, cat),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
