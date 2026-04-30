export interface CurrentUser {
  readonly authMethod: 'wechat';
  readonly phoneNumber?: string;
  readonly userId: string;
  readonly username: string;
  readonly wechatOpenId: string;
  readonly wechatUnionId?: string;
}
