import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
} from "@/features/admin/admin.schema";
import type { SessionUser } from "@/types";

const BCRYPT_ROUNDS = 12;

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  timezone: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const adminService = {
  async listUsers(query: ListUsersQuery) {
    const where: {
      isArchived?: boolean;
      role?: ListUsersQuery["role"];
      OR?: Array<
        | { name: { contains: string; mode: "insensitive" } }
        | { email: { contains: string; mode: "insensitive" } }
      >;
    } = {};
    if (query.archived === "true") where.isArchived = true;
    else if (query.archived === "false") where.isArchived = false;
    if (query.role) where.role = query.role;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return prisma.user.findMany({
      where,
      orderBy: [{ isArchived: "asc" }, { name: "asc" }],
      select: userSelect,
    });
  },

  async createUser(input: CreateUserInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw ApiErrors.conflict("EMAIL_TAKEN", "That email is already in use");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role ?? "MEMBER",
        timezone: input.timezone ?? "UTC",
      },
      select: userSelect,
    });
  },

  async updateUser(actor: SessionUser, id: string, input: UpdateUserInput) {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isArchived: true },
    });
    if (!existing) throw ApiErrors.notFound("User not found");

    const isSelf = actor.userId === id;

    if (isSelf && input.role !== undefined && input.role !== existing.role) {
      throw ApiErrors.forbidden("You can't change your own role");
    }
    if (isSelf && input.isArchived === true) {
      throw ApiErrors.forbidden("You can't archive your own account");
    }

    if (input.role !== undefined && existing.role === "ADMIN" && input.role !== "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", isArchived: false },
      });
      if (adminCount <= 1) {
        throw ApiErrors.conflict(
          "LAST_ADMIN",
          "At least one active admin must remain",
        );
      }
    }

    if (input.isArchived === true && existing.role === "ADMIN" && !existing.isArchived) {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", isArchived: false },
      });
      if (adminCount <= 1) {
        throw ApiErrors.conflict(
          "LAST_ADMIN",
          "At least one active admin must remain",
        );
      }
    }

    return prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      },
      select: userSelect,
    });
  },
};
