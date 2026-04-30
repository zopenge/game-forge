import type { UserStore } from '../storage/user-store';
import type { UserRecord } from '../types/domain';

import type { WechatAuthClient } from './wechat-auth-client';

export class WechatAuthError extends Error {}

export interface WechatAuthService {
  bindPhone(userId: string, code: string): Promise<{ phoneBound: true; user: UserRecord }>;
  login(code: string): Promise<{ phoneBound: boolean; token: string; user: UserRecord }>;
}

export interface CreateWechatAuthServiceOptions {
  readonly createToken: (userId: string) => Promise<string>;
  readonly userStore: UserStore;
  readonly wechatAuthClient: WechatAuthClient;
}

export const normalizeWechatCode = (code: string) => code.trim();

export const createWechatAuthService = ({
  createToken,
  userStore,
  wechatAuthClient
}: CreateWechatAuthServiceOptions): WechatAuthService => ({
  bindPhone: async (userId, code) => {
    const normalizedCode = normalizeWechatCode(code);

    if (!normalizedCode) {
      throw new WechatAuthError('WeChat phone code is required.');
    }

    try {
      const { phoneNumber } = await wechatAuthClient.bindPhone(normalizedCode);
      const user = userStore.updatePhoneNumber(userId, phoneNumber);

      if (!user) {
        throw new WechatAuthError('User not found.');
      }

      return {
        phoneBound: true,
        user
      };
    } catch (error) {
      if (error instanceof WechatAuthError) {
        throw error;
      }

      throw new WechatAuthError(error instanceof Error ? error.message : 'Invalid WeChat phone code.');
    }
  },
  login: async (code) => {
    const normalizedCode = normalizeWechatCode(code);

    if (!normalizedCode) {
      throw new WechatAuthError('WeChat login code is required.');
    }

    try {
      const identity = await wechatAuthClient.login(normalizedCode);
      const user = userStore.getOrCreateByWechat(identity.openId, identity.unionId);
      const token = await createToken(user.userId);

      return {
        phoneBound: Boolean(user.phoneNumber),
        token,
        user
      };
    } catch (error) {
      if (error instanceof WechatAuthError) {
        throw error;
      }

      throw new WechatAuthError(error instanceof Error ? error.message : 'Invalid WeChat login code.');
    }
  }
});
