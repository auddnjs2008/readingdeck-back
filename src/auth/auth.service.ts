import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile } from 'passport-google-oauth20';
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

  async validateGoogleUser(profile: Profile) {
    const provider = AuthProvider.GOOGLE;
    const providerUserId = profile.id;
    const email = profile.emails?.[0]?.value ?? null;
    const name = profile.displayName ?? 'user';
    const profileImage = profile.photos?.[0].value ?? null;
    let user = await this.users.findOne({
      where: { provider, providerUserId },
    });

    if (!user) {
      user = this.users.create({
        name,
        email,
        provider,
        providerUserId,
        profile: profileImage,
      });
      user = await this.users.save(user);
    }
    return user;
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

  async loginWithGoogle(user: User, res: Response) {
    const accessToken = await this.issueAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'prod',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'prod',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return {
      redirectUrl: this.configService.get<string>(
        envVariableKeys.frontLoginRedirectUrl,
      ),
    };
  }

  clearCookies(res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'prod',
      sameSite: process.env.NODE_ENV === 'prod' ? 'lax' : 'none',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'prod',
      sameSite: process.env.NODE_ENV === 'prod' ? 'lax' : 'none',
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
      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'prod',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });
      return { ok: true };
    } catch {
      this.clearCookies(res);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
