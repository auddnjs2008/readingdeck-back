import { Controller, Get, Req } from '@nestjs/common';
import { MeService } from './me.service';

@Controller('me')
export class MeController {
  constructor(private readonly MeService: MeService) {}

  @Get()
  async getMyProfile(@Req() req: any) {
    const userId = req.user.id;
    return this.MeService.getMyProfile(userId);
  }

  @Get('library-stats')
  async getLibraryStats(@Req() req: any) {
    const userId = req.user.sub;
    return this.MeService.getLibraryStats(userId);
  }

  @Get('daily-card-stack')
  async getDailyCardStack(@Req() req: any) {
    const userId = req.user.sub;
    return this.MeService.getDailyCardStack(userId);
  }

  @Get('revisit-card-stack')
  async getRevisitCardStack(@Req() req: any) {
    const userId = req.user.sub;
    return this.MeService.getRevisitCardStack(userId);
  }

  @Get('latest-book-list')
  async getLatestBookList(@Req() req: any) {
    const userId = req.user.sub;
    return this.MeService.getLatestBookList(userId);
  }
}
