import { faker } from '@faker-js/faker';
import type { CreateUserInput } from '@api/controllers/users.api';

/**
 * Builds a valid, collision-safe user payload. Pass overrides for only the fields a test cares about:
 *   userFactory.build({ role: 'admin' })
 */
export function buildUser(overrides: Partial<CreateUserInput> = {}): CreateUserInput {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const unique = faker.string.alphanumeric({ length: 10, casing: 'lower' });

  return {
    firstName,
    lastName,
    email: `limelight+${unique}@example.test`,
    role: 'member',
    password: faker.internet.password({ length: 16, prefix: 'Ll1!' }),
    ...overrides,
  };
}

export function buildUsers(count: number, overrides: Partial<CreateUserInput> = {}): CreateUserInput[] {
  return Array.from({ length: count }, () => buildUser(overrides));
}

export const userFactory = { build: buildUser, buildMany: buildUsers } as const;
export type UserFactory = typeof userFactory;
