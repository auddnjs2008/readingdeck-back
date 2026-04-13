import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-kakao';
import { envVariableKeys } from 'src/common/const/env.const';
import { AuthService } from '../auth.service';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>(envVariableKeys.kakaoAuthClientId),
      clientSecret:
        config.get<string>(envVariableKeys.kakaoAuthClientSecret) || undefined,
      callbackURL: config.get<string>(envVariableKeys.kakaoAuthCallbackUrl),
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    return this.authService.validateKakaoUser(profile);
  }
}
