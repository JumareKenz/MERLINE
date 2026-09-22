/**
 * No database. Pins the authorization shape of OrganizationsController:
 * before this, no route carried @Permissions and the `:id` routes were not
 * tenant-checked (TenantGuard only inspects `:orgId`), so any signed-in user
 * could read, edit or delete any organization, or promote themselves.
 */
import { NotFoundException } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { OrganizationsController } from './organizations.controller';

const user = {
  id: 'u1',
  email: 'u@t.test',
  firstName: 'U',
  lastName: 'One',
  organizationId: 'org-own',
};

function controllerWith() {
  const service = {
    findById: jest.fn(async (id: string) => ({ id })),
    findAll: jest.fn(async () => [{ id: 'org-own' }, { id: 'org-other' }]),
    update: jest.fn(async (id: string) => ({ id })),
    remove: jest.fn(async (id: string) => ({ id })),
  };
  return {
    service,
    controller: new OrganizationsController(service as any),
  };
}

function permissionsOf(method: keyof OrganizationsController): string[] {
  return (
    Reflect.getMetadata(
      PERMISSIONS_KEY,
      OrganizationsController.prototype[method],
    ) ?? []
  );
}

describe('OrganizationsController authorization', () => {
  it('lists only the caller’s own organization', async () => {
    const { controller, service } = controllerWith();
    await expect(controller.findAll(user)).resolves.toEqual([
      { id: 'org-own' },
    ]);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it.each(['findById', 'update', 'remove'] as const)(
    '%s refuses another organization’s id',
    async (method) => {
      const { controller, service } = controllerWith();
      const call =
        method === 'update'
          ? () => controller.update('org-other', {} as any, user)
          : () => controller[method]('org-other', user);
      expect(call).toThrow(NotFoundException);
      expect(service[method]).not.toHaveBeenCalled();
    },
  );

  it('allows the caller’s own organization', async () => {
    const { controller } = controllerWith();
    await expect(controller.findById('org-own', user)).resolves.toEqual({
      id: 'org-own',
    });
  });

  it.each([
    ['create', 'edit.organizations'],
    ['update', 'edit.organizations'],
    ['remove', 'edit.organizations'],
    ['getMembers', 'view.users'],
    ['addMember', 'create.users'],
    ['updateMemberRole', 'edit.users'],
    ['removeMember', 'delete.users'],
  ] as const)('%s requires %s', (method, permission) => {
    expect(permissionsOf(method)).toEqual([permission]);
  });
});
