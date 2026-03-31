import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express'; // 1. Ajoute ces imports

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 2. Augmente la limite de taille AVANT les autres configurations
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  app.setGlobalPrefix('api/v1');
  app.enableCors();
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 OMJEP API running on http://localhost:${port}/api/v1`);
}

bootstrap();