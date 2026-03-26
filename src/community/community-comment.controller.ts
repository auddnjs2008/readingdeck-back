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
  Req,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreateCommunityCommentDto } from './dto/create-community-comment.dto';

@Controller('community')
export class CommunityCommentController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('posts/:postId/comments')
  getCommunityComments(@Param('postId', ParseIntPipe) postId: number) {
    return this.communityService.getCommunityComments(postId);
  }

  @Post('posts/:postId/comments')
  createCommunityComment(
    @Req() req: any,
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: CreateCommunityCommentDto,
  ) {
    const userId = req.user.sub;
    return this.communityService.createCommunityComment(userId, postId, dto);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCommunityComment(
    @Req() req: any,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    const userId = req.user.sub;
    return this.communityService.deleteCommunityComment(userId, commentId);
  }
}
