export interface WechatLoginResult {
  readonly code: string;
}

export interface WechatRequestOptions {
  readonly data?: unknown;
  readonly header?: Record<string, string>;
  readonly method?: 'GET' | 'POST';
  readonly url: string;
}

export interface WechatRequestSuccess<T> {
  readonly data: T;
  readonly statusCode: number;
}

export interface WechatRuntime {
  login(options: {
    fail(error: unknown): void;
    success(result: WechatLoginResult): void;
  }): void;
  request<T>(options: WechatRequestOptions & {
    fail(error: unknown): void;
    success(result: WechatRequestSuccess<T>): void;
  }): void;
  setStorageSync(key: string, data: unknown): void;
}

declare const wx: WechatRuntime;

export const getWechatRuntime = (): WechatRuntime => wx;
