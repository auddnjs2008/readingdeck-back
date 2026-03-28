import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MeService } from './me.service';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

@Controller('me')
export class MeController {
  constructor(private readonly MeService: MeService) {}

  @Get()
  async getMyProfile(@Req() req: any) {
    const userId = req.user.sub;
    return this.MeService.getMyProfile(userId);
  }

  @Patch()
  @UseInterceptors(FileInterceptor('profileImage'))
  async updateMyProfile(
    @Req() req: any,
    @Body() dto: UpdateMyProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = req.user.sub;
    return this.MeService.updateMyProfile(userId, dto, file);
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

  @Get('home-summary')
  async getHomeSummary(@Req() req: any) {
    const userId = req.user.sub;
    return this.MeService.getHomeSummary(userId);
  }

  @Get('latest-book-list')
  async getLatestBookList(@Req() req: any) {
    const userId = req.user.sub;
    return this.MeService.getLatestBookList(userId);
  }
}
