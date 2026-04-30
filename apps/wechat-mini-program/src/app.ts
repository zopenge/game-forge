import { createWechatMiniProgramApiClient } from './api/wechat-api-client';
import { createWechatSession } from './auth/wechat-session';
import { getWechatRuntime } from './platform/wechat-runtime';

declare const App: (options: { onLaunch(): void | Promise<void> }) => void;

const runtime = getWechatRuntime();
const apiClient = createWechatMiniProgramApiClient({
  apiBaseUrl: 'https://game-forge.onrender.com',
  runtime
});
const session = createWechatSession({
  apiClient,
  runtime
});

App({
  onLaunch: async () => {
    await session.login();
  }
});
