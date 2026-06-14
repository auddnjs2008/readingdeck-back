import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile as GoogleProfile } from 'passport-google-oauth20';
import { Profile as KakaoProfile } from 'passport-kakao';
import { AuthProvider, User } from 'src/user/entity/user.entity';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { envVariableKeys } from 'src/common/const/env.const';
import { AuthMcpCode } from './entity/auth-mcp-code.entity';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(AuthMcpCode)
    private readonly authMcpCodes: Repository<AuthMcpCode>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions(maxAge: number) {
    const isProduction =
      this.configService.get<string>(envVariableKeys.env) === 'prod';
    const sameSite: 'none' | 'lax' = isProduction ? 'none' : 'lax';
    const domain = this.configService.get<string>(envVariableKeys.cookieDomain);

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      maxAge,
      ...(domain ? { domain } : {}),
    };
  }

  private getClearCookieOptions() {
    const options = this.getCookieOptions(0);

    return {
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
      ...(options.domain ? { domain: options.domain } : {}),
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

  async issueTokenPair(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessToken(user),
      this.issueRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 300,
    };
  }

  private getMcpAuthCodeTtlSeconds() {
    const ttl = Number(
      this.configService.get<string>(envVariableKeys.mcpAuthCodeTtlSeconds) ??
        '120',
    );

    if (!Number.isFinite(ttl) || ttl <= 0) {
      throw new InternalServerErrorException('Invalid MCP auth code TTL');
    }

    return ttl;
  }

  private getMcpAuthSuccessRedirectUrl() {
    const redirectUrl = this.configService.get<string>(
      envVariableKeys.mcpAuthSuccessRedirectUrl,
    );

    if (!redirectUrl) {
      throw new InternalServerErrorException(
        'MCP auth success redirect URL is not configured',
      );
    }

    return redirectUrl;
  }

  private hashMcpCode(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  private buildRedirectUrl(baseUrl: string, code: string) {
    const url = new URL(baseUrl);
    url.searchParams.set('code', code);
    return url.toString();
  }

  private async createMcpAuthCode(user: User) {
    const rawCode = randomBytes(32).toString('base64url');
    const redirectUri = this.getMcpAuthSuccessRedirectUrl();
    const expiresAt = new Date(
      Date.now() + this.getMcpAuthCodeTtlSeconds() * 1000,
    );

    const authCode = this.authMcpCodes.create({
      codeHash: this.hashMcpCode(rawCode),
      userId: user.id,
      provider: user.provider,
      redirectUri,
      expiresAt,
      usedAt: null,
    });

    await this.authMcpCodes.save(authCode);

    return {
      code: rawCode,
      redirectUri,
    };
  }

  private async loginWithOAuth(user: User, res: Response) {
    const { accessToken, refreshToken } = await this.issueTokenPair(user);

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

  private async loginWithOAuthForMcp(user: User) {
    const { code, redirectUri } = await this.createMcpAuthCode(user);

    return {
      redirectUrl: this.buildRedirectUrl(redirectUri, code),
    };
  }

  async loginWithGoogle(user: User, res: Response) {
    return this.loginWithOAuth(user, res);
  }

  async loginWithGoogleForMcp(user: User) {
    return this.loginWithOAuthForMcp(user);
  }

  async loginWithKakao(user: User, res: Response) {
    return this.loginWithOAuth(user, res);
  }

  async loginWithKakaoForMcp(user: User) {
    return this.loginWithOAuthForMcp(user);
  }

  clearCookies(res: Response) {
    const options = this.getClearCookieOptions();

    res.clearCookie('access_token', options);

    res.clearCookie('refresh_token', options);
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
        this.getCookieOptions(5 * 60 * 1000),
      );
      return { ok: true };
    } catch {
      this.clearCookies(res);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async exchangeMcpAuthCode(code: string) {
    const codeHash = this.hashMcpCode(code);
    const authCode = await this.authMcpCodes.findOne({
      where: { codeHash },
    });

    if (!authCode) {
      throw new UnauthorizedException('Invalid MCP auth code');
    }

    if (authCode.usedAt) {
      throw new UnauthorizedException('MCP auth code already used');
    }

    if (authCode.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('MCP auth code expired');
    }

    const user = await this.users.findOne({
      where: { id: authCode.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokenPair = await this.issueTokenPair(user);
    authCode.usedAt = new Date();
    await this.authMcpCodes.save(authCode);

    return {
      ...tokenPair,
      user: {
        id: user.id,
        name: user.name,
        provider: user.provider,
      },
    };
  }

  async refreshMcpToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        provider: AuthProvider;
      }>(refreshToken, {
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

      return this.issueTokenPair(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
