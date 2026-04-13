import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile as GoogleProfile } from 'passport-google-oauth20';
import { Profile as KakaoProfile } from 'passport-kakao';
import { AuthProvider, User } from 'src/user/entity/user.entity';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { envVariableKeys } from 'src/common/const/env.const';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions(maxAge: number) {
    const isProduction =
      this.configService.get<string>(envVariableKeys.env) === 'prod';
    const sameSite: 'none' | 'lax' = isProduction ? 'none' : 'lax';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      maxAge,
    };
  }

  private async findOrCreateOAuthUser(params: {
    provider: AuthProvider;
    providerUserId: string;
    email: string | null;
    name: string;
    profileImage: string | null;
  }) {
    let user = await this.users.findOne({
      where: {
        provider: params.provider,
        providerUserId: params.providerUserId,
      },
    });

    if (!user) {
      user = this.users.create({
        name: params.name,
        email: params.email,
        provider: params.provider,
        providerUserId: params.providerUserId,
        profile: params.profileImage,
      });
      user = await this.users.save(user);
    }

    return user;
  }

  async validateGoogleUser(profile: GoogleProfile) {
    return this.findOrCreateOAuthUser({
      provider: AuthProvider.GOOGLE,
      providerUserId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      name: profile.displayName ?? 'user',
      profileImage: profile.photos?.[0]?.value ?? null,
    });
  }

  async validateKakaoUser(profile: KakaoProfile) {
    const kakaoAccount = profile._json?.kakao_account;
    const kakaoProfile = kakaoAccount?.profile;

    return this.findOrCreateOAuthUser({
      provider: AuthProvider.KAKAO,
      providerUserId: String(profile.id),
      email: kakaoAccount?.email ?? null,
      name:
        kakaoProfile?.nickname ??
        profile.displayName ??
        profile.username ??
        'user',
      profileImage:
        kakaoProfile?.profile_image_url ??
        kakaoProfile?.thumbnail_image_url ??
        null,
    });
  }

  async issueAccessToken(user: User) {
    const payload = { sub: user.id, provider: user.provider };
    const accessTokenSecret = this.configService.get<string>(
      'ACCESS_TOKEN_SECRET',
    );

    return await this.jwtService.signAsync(payload, {
      secret: accessTokenSecret,
      expiresIn: 300,
    });
  }

  async issueRefreshToken(user: User) {
    const payload = { sub: user.id, provider: user.provider };
    const refreshTokenSecret = this.configService.get<string>(
      'REFRESH_TOKEN_SECRET',
    );

    return await this.jwtService.signAsync(payload, {
      secret: refreshTokenSecret,
      expiresIn: '24h',
    });
  }

  private async loginWithOAuth(user: User, res: Response) {
    const accessToken = await this.issueAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user);

    res.cookie(
      'access_token',
      accessToken,
      this.getCookieOptions(5 * 60 * 1000),
    );

    res.cookie(
      'refresh_token',
      refreshToken,
      this.getCookieOptions(24 * 60 * 60 * 1000),
    );

    return {
      redirectUrl: this.configService.get<string>(
        envVariableKeys.frontLoginRedirectUrl,
      ),
    };
  }

  async loginWithGoogle(user: User, res: Response) {
    return this.loginWithOAuth(user, res);
  }

  async loginWithKakao(user: User, res: Response) {
    return this.loginWithOAuth(user, res);
  }

  clearCookies(res: Response) {
    const isProduction =
      this.configService.get<string>(envVariableKeys.env) === 'prod';

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });
  }

  async refreshToken(req: Request, res: Response) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      this.clearCookies(res);
      throw new UnauthorizedException('No refresh token');
    }
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>(
          envVariableKeys.refreshTokenSecret,
        ),
      });

      const user = await this.users.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newAccessToken = await this.issueAccessToken(user);
      res.cookie(
        'access_token',
        newAccessToken,
        this.getCookieOptions(15 * 60 * 1000),
      );
      return { ok: true };
    } catch {
      this.clearCookies(res);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
