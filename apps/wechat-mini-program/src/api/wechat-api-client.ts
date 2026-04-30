import type { CurrentUser } from './wechat-auth-types';
import type { WechatRuntime } from '../platform/wechat-runtime';

export interface WechatLoginResponse {
  readonly phoneBound: boolean;
  readonly token: string;
  readonly user: CurrentUser;
  readonly userId: string;
}

export interface WechatBindPhoneResponse {
  readonly phoneBound: true;
  readonly user: CurrentUser;
}

export interface WechatMiniProgramApiClient {
  bindPhone(token: string, code: string): Promise<WechatBindPhoneResponse>;
  login(code: string): Promise<WechatLoginResponse>;
}

export interface CreateWechatMiniProgramApiClientOptions {
  readonly apiBaseUrl: string;
  readonly runtime: WechatRuntime;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/u, '');

export const createWechatMiniProgramApiClient = ({
  apiBaseUrl,
  runtime
}: CreateWechatMiniProgramApiClientOptions): WechatMiniProgramApiClient => {
  const baseUrl = trimTrailingSlash(apiBaseUrl);
  const request = <T>(path: string, data: unknown, token?: string) => new Promise<T>((resolve, reject) => {
    runtime.request<T>({
      data,
      fail: reject,
      header: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      method: 'POST',
      success: (result) => {
        if (result.statusCode < 200 || result.statusCode >= 300) {
          reject(new Error(`Request failed with status ${result.statusCode}.`));
          return;
        }

        resolve(result.data);
      },
      url: `${baseUrl}${path}`
    });
  });

  return {
    bindPhone: (token, code) => request<WechatBindPhoneResponse>('/auth/wechat/bind-phone', { code }, token),
    login: (code) => request<WechatLoginResponse>('/auth/wechat/login', { code })
  };
};
