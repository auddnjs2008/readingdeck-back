import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { Public } from './decorator/public.decorator';
import { GoogleMcpAuthGuard } from './guard/google-mcp-auth.guard';
import { KakaoMcpAuthGuard } from './guard/kakao-mcp-auth.guard';
import { ExchangeMcpAuthCodeDto } from './dto/exchange-mcp-auth-code.dto';
import { RefreshMcpTokenDto } from './dto/refresh-mcp-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('mcp/google')
  @Public()
  @UseGuards(GoogleMcpAuthGuard)
  googleMcpAuth() {}

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    const { redirectUrl } =
      req.query?.state === 'mcp'
        ? await this.authService.loginWithGoogleForMcp(user)
        : await this.authService.loginWithGoogle(user, res);
    return res.redirect(redirectUrl);
  }

  @Get('kakao')
  @Public()
  @UseGuards(AuthGuard('kakao'))
  kakaoAuth() {}

  @Get('mcp/kakao')
  @Public()
  @UseGuards(KakaoMcpAuthGuard)
  kakaoMcpAuth() {}

  @Get('kakao/callback')
  @Public()
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuthCallback(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    const { redirectUrl } =
      req.query?.state === 'mcp'
        ? await this.authService.loginWithKakaoForMcp(user)
        : await this.authService.loginWithKakao(user, res);
    return res.redirect(redirectUrl);
  }

  @Post('/refresh')
  @Public()
  async refreshToekn(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refreshToken(req, res);
  }

  @Post('/mcp/exchange')
  @Public()
  exchangeMcpAuthCode(@Body() body: ExchangeMcpAuthCodeDto) {
    return this.authService.exchangeMcpAuthCode(body.code);
  }

  @Post('/mcp/refresh')
  @Public()
  refreshMcpToken(@Body() body: RefreshMcpTokenDto) {
    return this.authService.refreshMcpToken(body.refreshToken);
  }
}
