import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { Public } from './decorator/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    const { redirectUrl } = await this.authService.loginWithGoogle(user, res);
    return res.redirect(redirectUrl);
  }

  @Post('/refresh')
  @Public()
  async refreshToekn(@Req() req: any, @Res() res: Response) {
    return this.authService.refreshToken(req, res);
  }
}
