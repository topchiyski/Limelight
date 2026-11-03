# Tutorial 2: Add an API resource

**You will build:** a typed `ProjectsApi` controller, a `projectFactory`, a `seedProject` fixture with automatic cleanup, and an API contract spec.
**You will learn:** schema-first typing with Zod, the controller pattern, the factory override pattern, and fixture teardown.
**Time:** about 30 minutes. **Prerequisite:** [Tutorial 1](01-add-a-page-object.md).

The examples assume REST endpoints `GET/POST /projects` and `GET/DELETE /projects/:id`.

## How it fits together

```text
tests/api/projects.api.spec.ts
      │  destructures { projectsApi, projectFactory, seedProject }
      ▼
src/fixtures/api.fixture.ts ── builds ──▶ ProjectsApi ──▶ LimelightApi ──▶ APIRequestContext
      │                                    (schemas)      (steps, status guard, validation)
      └── teardown: deletes every project created during the test
```

## Step 1: Define the schema and controller

Create `src/api/controllers/projects.api.ts`:

```ts
import { z } from 'zod';
import type { ApiResponse, LimelightApi } from '@api/client/limelightApi';

export const ProjectSchema = z.object({
  id: z.union([z.string().min(1), z.number().int()]),
  name: z.string().min(1),
  description: z.string().optional(),
  archived: z.boolean(),
});

export const ProjectListSchema = z.array(ProjectSchema);
export const CreateProjectSchema = ProjectSchema.omit({ id: true });

export type Project = z.output<typeof ProjectSchema>;
export type ProjectId = Project['id'];
export type CreateProjectInput = z.input<typeof CreateProjectSchema>;

const RESOURCE = 'projects';

export class ProjectsApi {
  /** Ids created through this instance; the fixture deletes them on teardown. */
  readonly createdIds = new Set<ProjectId>();

  constructor(
    private readonly api: LimelightApi,
    private readonly allowMutations: boolean,
  ) {}

  list(): Promise<ApiResponse<Project[]>> {
    return this.api.get(RESOURCE, { schema: ProjectListSchema });
  }

  get(id: ProjectId): Promise<ApiResponse<Project>> {
    return this.api.get(`${RESOURCE}/${id}`, { schema: ProjectSchema });
  }

  async exists(id: ProjectId): Promise<boolean> {
    const { status } = await this.api.get(`${RESOURCE}/${id}`, { expectedStatus: [200, 404] });
    return status === 200;
  }

  async create(input: CreateProjectInput): Promise<ApiResponse<Project>> {
    this.assertMutationsAllowed();
    const response = await this.api.post(RESOURCE, { data: input, schema: ProjectSchema, expectedStatus: [200, 201] });
    this.createdIds.add(response.data.id);
    return response;
  }

  async delete(id: ProjectId, options: { ignoreMissing?: boolean } = {}): Promise<number> {
    this.assertMutationsAllowed();
    const expectedStatus = options.ignoreMissing ? [200, 202, 204, 404] : [200, 202, 204];
    const { status } = await this.api.delete(`${RESOURCE}/${id}`, { expectedStatus });
    this.createdIds.delete(id);
    return status;
  }

  private assertMutationsAllowed(): void {
    if (!this.allowMutations) {
      throw new Error('ProjectsApi: write operations are disabled for TEST_ENV=prod. Tag the test @mutates.');
    }
  }
}
```

Key ideas:

| Pattern | What it gives you |
|---|---|
| **Schema first, types derived** (`z.output<typeof ProjectSchema>`) | One source of truth. A contract change becomes a compile error *and* a runtime validation failure. |
| **`schema` on every call** | `LimelightApi` validates the response body. Shape drift fails with a precise path, such as `→ at archived`. |
| **Relative paths** (`'projects'`, not `'/projects'`) | Paths resolve under `API_URL`. A leading `/` would drop the `/api` prefix. |
| **`expectedStatus`** | Anything outside it throws `LimelightApiError` with the response body. `exists()` treats 404 as a valid answer. |
| **`createdIds`** | Lets the fixture clean up even when a test fails midway. |
| **`assertMutationsAllowed()`** | A second safety net, alongside the `@mutates` exclusion on prod. |

## Step 2: Create the factory

Create `src/data/factories/project.factory.ts`:

```ts
import { faker } from '@faker-js/faker';
import type { CreateProjectInput } from '@api/controllers/projects.api';

export function buildProject(overrides: Partial<CreateProjectInput> = {}): CreateProjectInput {
  return {
    name: `Limelight ${faker.commerce.productName()} ${faker.string.alphanumeric(6)}`,
    description: faker.lorem.sentence(),
    archived: false,
    ...overrides,
  };
}

export const projectFactory = { build: buildProject } as const;
export type ProjectFactory = typeof projectFactory;
```

This is the **override pattern**. Every field gets a valid, unique default, and a test states only what it cares about, for example `projectFactory.build({ archived: true })`. The random suffix prevents collisions when tests run in parallel.

## Step 3: Register the fixtures

Open `src/fixtures/api.fixture.ts`. First add the imports:

```ts
import { ProjectsApi, type CreateProjectInput, type Project } from '@api/controllers/projects.api';
import { projectFactory as defaultProjectFactory, type ProjectFactory } from '@data/factories/project.factory';
```

Then extend the `ApiFixtures` interface:

```ts
  projectsApi: ProjectsApi;
  projectFactory: ProjectFactory;
  seedProject: (overrides?: Partial<CreateProjectInput>) => Promise<Project>;
```

Finally, add the fixture implementations inside `base.extend(...)`, after `seedUser`:

```ts
  projectsApi: async ({ limelightApi }, use) => {
    const projectsApi = new ProjectsApi(limelightApi, !isProd);
    await use(projectsApi);

    // Teardown: runs after the test, pass or fail.
    const leftovers = [...projectsApi.createdIds];
    const results = await Promise.allSettled(leftovers.map((id) => projectsApi.delete(id, { ignoreMissing: true })));
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed.length > 0) {
      throw new AggregateError(failed.map((f) => f.reason), `Failed to clean up ${failed.length} seeded project(s)`);
    }
  },

  projectFactory: async ({}, use) => {
    await use(defaultProjectFactory);
  },

  seedProject: async ({ projectsApi, projectFactory }, use) => {
    await use(async (overrides = {}) => {
      const { data } = await projectsApi.create(projectFactory.build(overrides));
      return data;
    });
  },
```

How the fixture lifecycle works:
- Code **before** `await use(...)` is setup, and code **after** it is teardown.
- `seedProject` depends on `projectsApi`, so it reuses the same instance. Every seeded project ends up in `createdIds` and is deleted afterwards.
- Cleanup uses `allSettled`, so one failed delete doesn't hide the others. A failed cleanup still fails the test, so leaks get noticed.
- `apiRequest` (the HTTP connection) is **worker-scoped**: each worker shares one connection across all its tests.

## Step 4: Write the API spec

Create `tests/api/projects.api.spec.ts`:

```ts
import { expect, test } from '@fixtures';

test.describe('Projects API', { tag: '@api' }, () => {
  test('GET /projects returns a schema-valid list', async ({ projectsApi }) => {
    const { status, data } = await projectsApi.list();

    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test('POST /projects creates a project', { tag: '@mutates' }, async ({ projectsApi, projectFactory }) => {
    const payload = projectFactory.build({ archived: false });

    const { status, data } = await projectsApi.create(payload);

    expect([200, 201]).toContain(status);
    expect(data).toMatchObject(payload);
  });

  test('DELETE /projects/:id removes the project', { tag: '@mutates' }, async ({ projectsApi, seedProject }) => {
    const project = await seedProject();

    await projectsApi.delete(project.id);

    expect(await projectsApi.exists(project.id)).toBe(false);
  });
});
```

The list test doesn't need to assert the schema explicitly, because `list()` already validated it. If validation failed, the call would have thrown.

## Step 5: Verify and run

```bash
npm run verify
npx playwright test tests/api/projects.api.spec.ts --project=api
```

Open `npm run report`. Each test shows steps like `POST projects` and `DELETE projects/42`, including the teardown deletes.

## Step 6 (optional): Make it hybrid

The fastest reliable UI tests **arrange through the API** and **assert through the UI**. Once you have a `ProjectsPage` (built as in [tutorial 1](01-add-a-page-object.md)), the spec looks like this:

```ts
test('a seeded project is listed', { tag: '@mutates' }, async ({ seedProject, projectsPage }) => {
  const project = await seedProject({ name: 'Hybrid demo' });   // API: fast, deterministic

  await projectsPage.goto();                                     // UI: what the user sees

  await expect(projectsPage.row(project.name)).toBeVisible();
});                                                              // teardown deletes the project
```

See `tests/e2e/user-journey.spec.ts` for the complete users version.

## Recap

1. Schema → types → controller (`projects.api.ts`)
2. Factory with valid unique defaults and overrides
3. Fixtures: controller with teardown, factory, and seeding helper
4. Spec: destructure fixtures and assert; cleanup is automatic

**Next:** [Tutorial 3: Visual regression testing](03-visual-regression.md)
