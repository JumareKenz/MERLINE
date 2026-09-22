import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Global: every module needing object storage (media, and Phase 2 recording
 * uploads) injects StorageService directly without importing this module.
 */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
