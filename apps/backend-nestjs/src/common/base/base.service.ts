import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

type TransactionClient = Omit<
  PrismaService,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export class BaseService {
  constructor(protected readonly prisma: PrismaService) {}

  protected async executeTransaction<T>(
    fn: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        return fn(tx as unknown as TransactionClient);
      },
      {
        timeout: 30000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );
  }
}
