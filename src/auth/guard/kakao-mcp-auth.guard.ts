import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class KakaoMcpAuthGuard extends AuthGuard('kakao') {
  override getAuthenticateOptions() {
    return {
      state: 'mcp',
    };
  }
}
