import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { GetCommunityPostsQueryDto } from './dto/get-community-posts-query.dto';
import { Public } from '../auth/decorator/public.decorator';

@Controller('community/posts')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get()
  @Public()
  getCommunityPosts(@Query() query: GetCommunityPostsQueryDto) {
    return this.communityService.getCommunityPosts(query);
  }

  @Get(':postId')
  @Public()
  getCommunityPost(@Param('postId', ParseIntPipe) postId: number) {
    return this.communityService.getCommunityPost(postId);
  }

  @Post()
  createCommunityPost(@Req() req: any, @Body() dto: CreateCommunityPostDto) {
    const userId = req.user.sub;
    return this.communityService.createCommunityPost(userId, dto);
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCommunityPost(
    @Req() req: any,
    @Param('postId', ParseIntPipe) postId: number,
  ) {
    const userId = req.user.sub;
    return this.communityService.deleteCommunityPost(userId, postId);
  }
}
