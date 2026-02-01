import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KakaoBookService } from './kakao-book.service';

@Module({
  imports: [HttpModule],
  providers: [KakaoBookService],
  exports: [KakaoBookService],
})
export class KakaoModule {}
