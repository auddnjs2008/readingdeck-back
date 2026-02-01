import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { envVariableKeys } from 'src/common/const/env.const';
import { lastValueFrom } from 'rxjs';
import { SearchBookQueryDto } from 'src/book/dto/search-book-query.dto';

@Injectable()
export class KakaoBookService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async searchBooks(query: SearchBookQueryDto) {
    const apiKey = this.config.get<string>(envVariableKeys.kakaoRestApiKey);
    const apiUrl = this.config.get<string>(envVariableKeys.kakaoBookApiUrl);
    const { query: keyword, page = 1, size = 10, sort, target } = query;

    const response = this.http.get(apiUrl, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      params: {
        query: keyword,
        page,
        size,
        sort,
        target,
      },
    });

    const { data } = await lastValueFrom(response);
    return data;
  }
}
