import { Controller, Get, Req } from '@nestjs/common';
import { MeService } from './me.service';

@Controller('me')
export class MeController {
  constructor(private readonly MeService: MeService) {}

  @Get('library-stats')
  async getLibraryStats(@Req() req: any) {
    const userId = req.user.sub;
    return this.MeService.getLibraryStats(userId);
  }
}
