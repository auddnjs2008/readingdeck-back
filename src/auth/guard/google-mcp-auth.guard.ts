import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleMcpAuthGuard extends AuthGuard('google') {
  override getAuthenticateOptions() {
    return {
      state: 'mcp',
    };
  }
}
