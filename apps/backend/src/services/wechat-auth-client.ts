export interface WechatLoginIdentity {
  readonly openId: string;
  readonly unionId?: string;
}

export interface WechatPhoneIdentity {
  readonly phoneNumber: string;
}

export interface WechatAuthClient {
  bindPhone(code: string): Promise<WechatPhoneIdentity>;
  login(code: string): Promise<WechatLoginIdentity>;
}

export interface CreateWechatAuthClientOptions {
  readonly appId?: string;
  readonly appSecret?: string;
  readonly fetchImpl?: typeof fetch;
}

interface WechatLoginResponse {
  readonly errcode?: number;
  readonly errmsg?: string;
  readonly openid?: string;
  readonly unionid?: string;
}

interface WechatPhoneResponse {
  readonly errcode?: number;
  readonly errmsg?: string;
  readonly phone_info?: {
    readonly phoneNumber?: string;
    readonly purePhoneNumber?: string;
  };
}

export const createWechatAuthClient = ({
  appId = process.env.WECHAT_APP_ID,
  appSecret = process.env.WECHAT_APP_SECRET,
  fetchImpl = fetch
}: CreateWechatAuthClientOptions = {}): WechatAuthClient => {
  const getConfiguredCredentials = () => {
    if (!appId || !appSecret) {
      throw new Error('WeChat app credentials are not configured.');
    }

    return {
      appId,
      appSecret
    };
  };

  const getAccessToken = async () => {
    const credentials = getConfiguredCredentials();

    const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
    url.searchParams.set('grant_type', 'client_credential');
    url.searchParams.set('appid', credentials.appId);
    url.searchParams.set('secret', credentials.appSecret);

    const response = await fetchImpl(url);
    const body = await response.json() as { access_token?: string; errcode?: number; errmsg?: string };

    if (!response.ok || body.errcode || !body.access_token) {
      throw new Error(body.errmsg ?? 'Unable to get WeChat access token.');
    }

    return body.access_token;
  };

  return {
    bindPhone: async (code) => {
      const accessToken = await getAccessToken();
      const url = new URL('https://api.weixin.qq.com/wxa/business/getuserphonenumber');
      url.searchParams.set('access_token', accessToken);

      const response = await fetchImpl(url, {
        body: JSON.stringify({ code }),
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST'
      });
      const body = await response.json() as WechatPhoneResponse;
      const phoneNumber = body.phone_info?.phoneNumber ?? body.phone_info?.purePhoneNumber;

      if (!response.ok || body.errcode || !phoneNumber) {
        throw new Error(body.errmsg ?? 'Invalid WeChat phone code.');
      }

      return { phoneNumber };
    },
    login: async (code) => {
      const credentials = getConfiguredCredentials();

      const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
      url.searchParams.set('appid', credentials.appId);
      url.searchParams.set('secret', credentials.appSecret);
      url.searchParams.set('js_code', code);
      url.searchParams.set('grant_type', 'authorization_code');

      const response = await fetchImpl(url);
      const body = await response.json() as WechatLoginResponse;

      if (!response.ok || body.errcode || !body.openid) {
        throw new Error(body.errmsg ?? 'Invalid WeChat login code.');
      }

      return body.unionid
        ? {
          openId: body.openid,
          unionId: body.unionid
        }
        : {
          openId: body.openid
        };
    }
  };
};
