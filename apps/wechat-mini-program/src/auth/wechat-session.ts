import type { WechatMiniProgramApiClient } from '../api/wechat-api-client';
import type { WechatRuntime } from '../platform/wechat-runtime';

export interface WechatSession {
  login(): Promise<void>;
}

export interface CreateWechatSessionOptions {
  readonly apiClient: WechatMiniProgramApiClient;
  readonly runtime: WechatRuntime;
  readonly tokenStorageKey?: string;
}

export const createWechatSession = ({
  apiClient,
  runtime,
  tokenStorageKey = 'game-forge.token'
}: CreateWechatSessionOptions): WechatSession => ({
  login: async () => {
    const loginResult = await new Promise<{ code: string }>((resolve, reject) => {
      runtime.login({
        fail: reject,
        success: resolve
      });
    });
    const session = await apiClient.login(loginResult.code);

    runtime.setStorageSync(tokenStorageKey, session.token);
  }
});
