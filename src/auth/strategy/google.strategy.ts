import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { envVariableKeys } from 'src/common/const/env.const';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>(envVariableKeys.googleClientId),
      clientSecret: config.get<string>(envVariableKeys.googleClientSecret),
      callbackURL: config.get<string>(envVariableKeys.googleCallbackUrl),
      scope: ['profile', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    return this.authService.validateGoogleUser(profile);
  }
}
