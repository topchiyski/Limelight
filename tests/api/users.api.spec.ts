import { UserSchema } from '@api/controllers/users.api';
import { expect, test } from '@fixtures';

test.describe('Users API', { tag: '@api' }, () => {
  test('GET /users returns a schema-valid list', async ({ usersApi }) => {
    const { status, headers, data } = await usersApi.list();

    expect(status).toBe(200);
    expect(headers['content-type']).toContain('application/json');
    expect(Array.isArray(data)).toBe(true);
  });

  test('POST /users creates a user matching the payload', { tag: '@mutates' }, async ({ usersApi, userFactory }) => {
    const payload = userFactory.build({ role: 'viewer' });

    const { status, data: created } = await usersApi.create(payload);

    expect([200, 201]).toContain(status);
    expect(UserSchema.safeParse(created).success).toBe(true);
    expect(created).toMatchObject({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      role: 'viewer',
    });
    expect(created).not.toHaveProperty('password');
  });

  test('GET /users/:id returns the seeded user', { tag: '@mutates' }, async ({ usersApi, seedUser }) => {
    const seeded = await seedUser();

    const { status, data } = await usersApi.get(seeded.id);

    expect(status).toBe(200);
    expect(data).toEqual(seeded);
  });

  test('PATCH /users/:id updates only the given fields', { tag: '@mutates' }, async ({ usersApi, seedUser }) => {
    const seeded = await seedUser({ role: 'member' });

    const { status, data } = await usersApi.update(seeded.id, { role: 'admin' });

    expect(status).toBe(200);
    expect(data).toMatchObject({ id: seeded.id, email: seeded.email, role: 'admin' });
  });

  test('DELETE /users/:id removes the user', { tag: '@mutates' }, async ({ usersApi, seedUser }) => {
    const seeded = await seedUser();

    const status = await usersApi.delete(seeded.id);

    expect([200, 202, 204]).toContain(status);
    expect(await usersApi.exists(seeded.id)).toBe(false);
  });

  test('POST /users rejects an invalid email', { tag: '@mutates' }, async ({ usersApi, userFactory }) => {
    const { status } = await usersApi.createExpectingError(userFactory.build({ email: 'not-an-email' }));

    expect([400, 422]).toContain(status);
  });

  test('GET /users/:id returns 404 for an unknown id', async ({ usersApi }) => {
    expect(await usersApi.exists('limelight-does-not-exist-0000')).toBe(false);
  });
});
