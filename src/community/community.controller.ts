import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { GetCommunityPostsQueryDto } from './dto/get-community-posts-query.dto';

@Controller('community/posts')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get()
  getCommunityPosts(@Query() query: GetCommunityPostsQueryDto) {
    return this.communityService.getCommunityPosts(query);
  }

  @Get(':postId')
  getCommunityPost(@Param('postId', ParseIntPipe) postId: number) {
    return this.communityService.getCommunityPost(postId);
  }

  @Post()
  createCommunityPost(@Req() req: any, @Body() dto: CreateCommunityPostDto) {
    const userId = req.user.sub;
    return this.communityService.createCommunityPost(userId, dto);
  }
}
