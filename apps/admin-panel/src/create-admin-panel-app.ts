import { createDeviceProfile, describeDeviceProfile } from '@game-forge/device';
import { createSessionId } from '@game-forge/identity';

export interface AdminPanelAppOptions {
  readonly host: HTMLElement;
}

export const renderAdminPanelMarkup = () => {
  const deviceProfile = createDeviceProfile({
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    userAgent: navigator.userAgent,
    width: window.innerWidth
  });

  const sessionId = createSessionId('admin');

  return `
    <section style="width:min(480px, calc(100% - 32px)); padding: 24px; border-radius: 20px; background: rgba(255,255,255,0.84); box-shadow: 0 20px 60px rgba(15, 41, 66, 0.14);">
      <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.18em; color: #51708b;">game forge</p>
      <h1 style="margin: 12px 0 8px; font-size: 32px;">admin panel</h1>
      <p style="margin: 0 0 20px; color: #466680;">session <strong>${sessionId}</strong></p>
      <dl style="display: grid; grid-template-columns: 120px 1fr; gap: 10px 16px; margin: 0;">
        <dt style="font-weight: 600;">device</dt>
        <dd style="margin: 0;">${describeDeviceProfile(deviceProfile)}</dd>
        <dt style="font-weight: 600;">status</dt>
        <dd style="margin: 0;">workspace ready</dd>
      </dl>
    </section>
  `.trim();
};

export const createAdminPanelApp = ({ host }: AdminPanelAppOptions) => ({
  start: () => {
    host.innerHTML = renderAdminPanelMarkup();
  }
});
