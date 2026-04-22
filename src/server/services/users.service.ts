import { prisma } from "@/lib/prisma";

const listSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

export const usersService = {
  async listSelectable() {
    return prisma.user.findMany({
      where: { isArchived: false },
      orderBy: [{ name: "asc" }],
      select: listSelect,
    });
  },
};
