import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontRedirectUrl = process.env.FRONT_LOGIN_REDIRECT_URL;
  const frontOrigin = frontRedirectUrl
    ? new URL(frontRedirectUrl).origin
    : undefined;
  const corsOrigins = [
    'http://localhost:4000',
    frontOrigin,
  ].filter((url): url is string => Boolean(url));

  app.enableCors({
    origin: [...new Set(corsOrigins)],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // DTO 타입 변환
      whitelist: true, // DTO에 없는 필드 제거
      forbidNonWhitelisted: true, // DTO에 없는 필드 들어오면 에러
    }),
  );

  await app.listen(process.env.PORT ?? 5500);
}
bootstrap();
