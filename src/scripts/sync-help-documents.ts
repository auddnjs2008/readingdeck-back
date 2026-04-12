import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { AiHelpDocumentSyncService } from 'src/ai/ai-help-document-sync.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const syncService = app.get(AiHelpDocumentSyncService);
    await syncService.syncFromFile();
  } finally {
    await app.close();
  }
}

void bootstrap();
