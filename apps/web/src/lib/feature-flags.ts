/**
 * 前端特性开关。
 *
 * featurePhoneEnabled：手机号相关功能（注册/登录/绑定换绑）。
 * 站长决定：短信平台签名/模板需企业资质，暂未就绪，前端对用户封闭入口；
 * 后端接口全部保留（契约 PR #82），将来短信平台就绪后改为 true 即全部恢复。
 */
export const featurePhoneEnabled = false;
