import { test as base, type APIRequestContext } from '@playwright/test';
import { LimelightApi } from '@api/client/limelightApi';
import { UsersApi, type CreateUserInput, type User } from '@api/controllers/users.api';
import { env, isProd } from '@config/env';
import { userFactory as defaultUserFactory, type UserFactory } from '@data/factories/user.factory';

export interface ApiFixtures {
  limelightApi: LimelightApi;
  /** Users controller. Every user created through it is deleted after the test. */
  usersApi: UsersApi;
  userFactory: UserFactory;
  /** Creates a user via the API (factory defaults + overrides); auto-deleted after the test. */
  seedUser: (overrides?: Partial<CreateUserInput>) => Promise<User>;
}

export interface ApiWorkerFixtures {
  apiRequest: APIRequestContext;
}

export const test = base.extend<ApiFixtures, ApiWorkerFixtures>({
  apiRequest: [
    async ({ playwright }, use) => {
      const context = await playwright.request.newContext({
        baseURL: env.API_URL,
        extraHTTPHeaders: {
          Accept: 'application/json',
          ...(env.API_TOKEN && { Authorization: `Bearer ${env.API_TOKEN}` }),
        },
      });
      await use(context);
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  limelightApi: async ({ apiRequest }, use) => {
    await use(new LimelightApi(apiRequest));
  },

  usersApi: async ({ limelightApi }, use) => {
    const usersApi = new UsersApi(limelightApi, !isProd);
    await use(usersApi);

    const leftovers = [...usersApi.createdIds];
    const results = await Promise.allSettled(leftovers.map((id) => usersApi.delete(id, { ignoreMissing: true })));
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed.length > 0) {
      throw new AggregateError(failed.map((f) => f.reason), `Failed to clean up ${failed.length} seeded user(s)`);
    }
  },

  userFactory: async ({}, use) => {
    await use(defaultUserFactory);
  },

  seedUser: async ({ usersApi, userFactory }, use) => {
    await use(async (overrides = {}) => {
      const { data } = await usersApi.create(userFactory.build(overrides));
      return data;
    });
  },
});
