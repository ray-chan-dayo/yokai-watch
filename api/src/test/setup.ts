import { beforeEach } from "vitest";
import prisma from "../lib/prisma";

beforeEach(async () => {
  await prisma.monster.deleteMany();
  await prisma.book.deleteMany();
});
