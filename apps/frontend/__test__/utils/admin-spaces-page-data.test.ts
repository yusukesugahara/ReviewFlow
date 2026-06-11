import {
  buildAdminSpaceListItems,
  canCreateSpace,
  canManageSpace,
  isSystemAdminUser,
  normalizeAvailableUsers,
  normalizeGroups,
  normalizeMembers,
  normalizeTenantUsers,
  statusFromResponse,
} from "@/app/(authorized)/admin/spaces/admin-spaces-page-data";
import { TENANT_ROLES } from "@/lib/constants/roles";
import type {
  AdminSpacesAvailableUsersData,
  AdminSpacesGroupsData,
  AdminSpacesMembersData,
  AdminSpacesUsersData,
} from "@/app/(authorized)/admin/spaces/types";

const createdAt = "2026-06-06T00:00:00.000Z";

const groups: AdminSpacesGroupsData["groups"] = [
  {
    id: "space-1",
    name: "営業部",
    description: "営業用",
    createdByUserId: "user-1",
    createdAt,
    updatedAt: createdAt,
    currentUserRole: "admin",
  },
  {
    id: "space-2",
    name: "経理部",
    description: null,
    createdByUserId: "user-2",
    createdAt,
    updatedAt: createdAt,
    currentUserRole: null,
  },
];

const members: AdminSpacesMembersData["members"] = [
  {
    id: "member-1",
    groupId: "space-1",
    userId: "user-1",
    email: "admin@example.com",
    name: {} as Record<string, never>,
    role: "admin",
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "member-2",
    groupId: "space-1",
    userId: "user-2",
    email: "member@example.com",
    name: "Member" as unknown as Record<string, never>,
    role: "user",
    createdAt,
    updatedAt: createdAt,
  },
];

describe("admin spaces page data", () => {
  // テスト内容: API レスポンスの optional 表示名を view 用に正規化できることを確認する
  it("normalizes group, member, available user, and tenant user names", () => {
    const availableUsers: AdminSpacesAvailableUsersData["users"] = [
      {
        id: "user-3",
        email: "add@example.com",
        name: "Add User" as unknown as Record<string, never>,
      },
      {
        id: "user-4",
        email: "empty@example.com",
        name: {} as Record<string, never>,
      },
    ];
    const tenantUsers: AdminSpacesUsersData["users"] = [
      {
        id: "user-5",
        email: "tenant@example.com",
        name: "Tenant User",
        role: TENANT_ROLES.user,
        isActive: true,
        createdAt,
      },
      {
        id: "user-6",
        email: "tenant-empty@example.com",
        name: null,
        role: TENANT_ROLES.admin,
        isActive: true,
        createdAt,
      },
    ];

    expect(normalizeGroups(groups).map((group) => group.description)).toEqual([
      "営業用",
      null,
    ]);
    expect(normalizeMembers(members).map((member) => member.name)).toEqual([
      null,
      "Member",
    ]);
    expect(normalizeAvailableUsers(availableUsers).map((user) => user.name)).toEqual([
      "Add User",
      null,
    ]);
    expect(normalizeTenantUsers(tenantUsers).map((user) => user.name)).toEqual([
      "Tenant User",
      null,
    ]);
  });

  // テスト内容: テナント管理者だけがスペース作成できることを確認する
  it("detects system admin permissions", () => {
    expect(isSystemAdminUser({ roles: [TENANT_ROLES.admin] })).toBe(true);
    expect(canCreateSpace({ roles: [TENANT_ROLES.admin] })).toBe(true);
    expect(isSystemAdminUser({ roles: [TENANT_ROLES.user] })).toBe(false);
    expect(canCreateSpace({ roles: [TENANT_ROLES.user] })).toBe(false);
  });

  // テスト内容: スペース管理可否をシステム管理者またはスペース管理者メンバーで判定することを確認する
  it("detects space management permissions", () => {
    const normalizedMembers = normalizeMembers(members);

    expect(
      canManageSpace({
        currentUserId: "user-9",
        isSystemAdmin: true,
        members: normalizedMembers,
      }),
    ).toBe(true);
    expect(
      canManageSpace({
        currentUserId: "user-1",
        isSystemAdmin: false,
        members: normalizedMembers,
      }),
    ).toBe(true);
    expect(
      canManageSpace({
        currentUserId: "user-2",
        isSystemAdmin: false,
        members: normalizedMembers,
      }),
    ).toBe(false);
  });

  // テスト内容: スペース一覧用 view model にメンバー、追加可能ユーザ、管理可否をまとめられることを確認する
  it("builds admin space list items", () => {
    const normalizedGroups = normalizeGroups(groups);
    const normalizedMembers = normalizeMembers(members);
    const addableUsers = normalizeAvailableUsers([
      {
        id: "user-3",
        email: "add@example.com",
        name: "Add User" as unknown as Record<string, never>,
      },
    ]);

    const items = buildAdminSpaceListItems({
      availableUsersByGroup: new Map([["space-1", addableUsers]]),
      currentUserId: "user-1",
      groups: normalizedGroups,
      isSystemAdmin: false,
      membersByGroup: new Map([["space-1", normalizedMembers]]),
    });

    expect(items).toMatchObject([
      {
        group: { id: "space-1" },
        members: normalizedMembers,
        addableUsers,
        canManageSpace: true,
      },
      {
        group: { id: "space-2" },
        members: [],
        addableUsers: [],
        canManageSpace: false,
      },
    ]);
  });

  // テスト内容: 取得失敗時の status fallback を確認する
  it("reads response statuses with fallback", () => {
    expect(statusFromResponse({ status: 403 })).toBe(403);
    expect(statusFromResponse()).toBe(500);
  });
});
