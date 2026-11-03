import { z } from 'zod';
import type { ApiResponse, LimelightApi } from '@api/client/limelightApi';

// Reference contract. Align these schemas with your service's real OpenAPI definition.
export const UserRoleSchema = z.enum(['admin', 'member', 'viewer']);

export const UserSchema = z.object({
  id: z.union([z.string().min(1), z.number().int()]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  role: UserRoleSchema,
  createdAt: z.iso.datetime({ offset: true }).optional(),
});

export const UserListSchema = z.array(UserSchema);

export const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true }).extend({
  password: z.string().min(8),
});

export const UpdateUserSchema = CreateUserSchema.omit({ password: true }).partial();

export type User = z.output<typeof UserSchema>;
export type UserId = User['id'];
export type UserRole = z.output<typeof UserRoleSchema>;
export type CreateUserInput = z.input<typeof CreateUserSchema>;
export type UpdateUserInput = z.input<typeof UpdateUserSchema>;

const RESOURCE = 'users';

export class UsersApi {
  /** Ids created through this instance; the `usersApi` fixture deletes them on teardown. */
  readonly createdIds = new Set<UserId>();

  constructor(
    private readonly api: LimelightApi,
    private readonly allowMutations: boolean,
  ) {}

  list(params: { search?: string } = {}): Promise<ApiResponse<User[]>> {
    return this.api.get(RESOURCE, { schema: UserListSchema, ...(params.search && { params: { search: params.search } }) });
  }

  get(id: UserId): Promise<ApiResponse<User>> {
    return this.api.get(`${RESOURCE}/${id}`, { schema: UserSchema });
  }

  async exists(id: UserId): Promise<boolean> {
    const { status } = await this.api.get(`${RESOURCE}/${id}`, { expectedStatus: [200, 404] });
    return status === 200;
  }

  async create(input: CreateUserInput): Promise<ApiResponse<User>> {
    this.assertMutationsAllowed();
    const response = await this.api.post(RESOURCE, { data: input, schema: UserSchema, expectedStatus: [200, 201] });
    this.createdIds.add(response.data.id);
    return response;
  }

  /** Negative-path create: returns the raw error response instead of throwing. */
  createExpectingError(input: unknown, expectedStatus: readonly number[] = [400, 422]): Promise<ApiResponse<unknown>> {
    this.assertMutationsAllowed();
    return this.api.post(RESOURCE, { data: input, expectedStatus });
  }

  update(id: UserId, patch: UpdateUserInput): Promise<ApiResponse<User>> {
    this.assertMutationsAllowed();
    return this.api.patch(`${RESOURCE}/${id}`, { data: patch, schema: UserSchema });
  }

  async delete(id: UserId, options: { ignoreMissing?: boolean } = {}): Promise<number> {
    this.assertMutationsAllowed();
    const expectedStatus = options.ignoreMissing ? [200, 202, 204, 404] : [200, 202, 204];
    const { status } = await this.api.delete(`${RESOURCE}/${id}`, { expectedStatus });
    this.createdIds.delete(id);
    return status;
  }

  private assertMutationsAllowed(): void {
    if (!this.allowMutations) {
      throw new Error('UsersApi: write operations are disabled for TEST_ENV=prod. Tag the test @mutates.');
    }
  }
}
