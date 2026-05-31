import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { GoogleStrategy } from './strategy/google.strategy';
import { JwtModule } from '@nestjs/jwt';
import { KakaoStrategy } from './strategy/kakao.strategy';
import { AuthMcpCode } from './entity/auth-mcp-code.entity';
import { GoogleMcpAuthGuard } from './guard/google-mcp-auth.guard';
import { KakaoMcpAuthGuard } from './guard/kakao-mcp-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    TypeOrmModule.forFeature([User, AuthMcpCode]),
    JwtModule.register({}),
  ],
  providers: [
    AuthService,
    GoogleStrategy,
    KakaoStrategy,
    GoogleMcpAuthGuard,
    KakaoMcpAuthGuard,
  ],
  controllers: [AuthController],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
