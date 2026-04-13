import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { GoogleStrategy } from './strategy/google.strategy';
import { JwtModule } from '@nestjs/jwt';
import { KakaoStrategy } from './strategy/kakao.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    TypeOrmModule.forFeature([User]),
    JwtModule.register({}),
  ],
  providers: [AuthService, GoogleStrategy, KakaoStrategy],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
