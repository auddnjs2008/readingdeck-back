import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { envVariableKeys } from 'src/common/const/env.const';

// Keep the real cookie-clearing implementation, without OAuth or DB access.
describe('로그아웃', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const service = Object.create(AuthService.prototype) as AuthService;
    Object.assign(service, {
      configService: new ConfigService({
        [envVariableKeys.env]: 'prod',
        [envVariableKeys.cookieDomain]: '.readingdeck.co',
      }),
    });
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalGuards(
      new JwtAuthGuard(new JwtService(), new ConfigService(), new Reflector()),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  it.each([undefined, 'access_token=expired; refresh_token=expired'])(
    '쿠키가 없거나 만료되어도 두 인증 쿠키를 만료시킨다: %s',
    async (cookie) => {
      const call = request(app.getHttpServer()).post('/auth/logout');
      if (cookie) call.set('Cookie', cookie);
      const response = await call.expect(200);
      expect(response.body).toEqual({ ok: true });
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toHaveLength(2);
      for (const name of ['access_token', 'refresh_token']) {
        expect(cookies.find((value) => value.startsWith(`${name}=`))).toMatch(
          /Expires=Thu, 01 Jan 1970/,
        );
      }
      for (const value of cookies) {
        expect(value).toContain('Domain=.readingdeck.co');
        expect(value).toContain('Path=/');
        expect(value).toContain('HttpOnly');
        expect(value).toContain('Secure');
        expect(value).toContain('SameSite=None');
      }
    },
  );
});
