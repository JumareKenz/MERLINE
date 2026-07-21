import { Prisma } from '@prisma/client';

export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function toNullableJsonValue(value: unknown | null): Prisma.InputJsonValue | null {
  return value as Prisma.InputJsonValue | null;
}

export function jsonObject(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
