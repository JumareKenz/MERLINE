export interface CrudService<T, CreateDto, UpdateDto, QueryDto = { page?: number; limit?: number }> {
  findAll(query?: QueryDto): Promise<{ items: T[]; total: number }>;
  findById(id: string): Promise<T>;
  create(dto: CreateDto): Promise<T>;
  update(id: string, dto: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
}
