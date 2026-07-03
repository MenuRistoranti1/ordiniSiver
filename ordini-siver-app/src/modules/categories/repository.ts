import type { CrudRepository } from "@/core/crud/types"
import { CategoriesService } from "@/services/categories.service"
import type { Category, CategoryForm } from "./types"

export const CategoriesRepository: CrudRepository<Category, CategoryForm> = {
  load() {
    return CategoriesService.getAll()
  },

  create(form) {
    return CategoriesService.create(form)
  },

  update(id, form) {
    return CategoriesService.update(id, form)
  },

  remove(id) {
    return CategoriesService.delete(id)
  },
}