import { useMemo } from 'react';
import { useStore } from '../../stores';
import { usePluginIframe } from '../../hooks/use-plugin-iframe';
import { hanaUrl } from '../../hooks/use-hana-fetch';
import s from './PluginWidgetView.module.css';
import { DEFAULT_THEME } from '../../../shared/theme-registry';

interface Props {
  pluginId: string;
}

export function PluginWidgetView({ pluginId }: Props) {
  const widgets = useStore(st => st.pluginWidgets);
  const agentId = useStore(st => st.currentAgentId);
  const sessionPath = useStore(st => st.currentSessionPath);
  const widget = useMemo(() => widgets.find(w => w.pluginId === pluginId), [widgets, pluginId]);

  const iframeSrc = useMemo(() => {
    if (!widget?.routeUrl) return null;
    const theme = document.documentElement.dataset.theme || DEFAULT_THEME;
    const cssUrl = hanaUrl(`/api/plugins/theme.css?theme=${encodeURIComponent(theme)}`);
    const fullUrl = hanaUrl(widget.routeUrl);
    const sep = fullUrl.includes('?') ? '&' : '?';
    const params = new URLSearchParams({
      agentId: agentId || '',
      'hana-theme': theme,
      'hana-css': cssUrl,
    });
    if (sessionPath) params.set('sessionPath', sessionPath);
    return `${fullUrl}${sep}${params.toString()}`;
  }, [widget?.routeUrl, agentId, sessionPath]);

  const { iframeRef, status, retry } = usePluginIframe(iframeSrc, {
    pluginId,
    agentId,
    slot: 'widget',
    capabilityGrants: widget?.hostCapabilities ?? [],
  });

  if (!widget) {
    return <div className={s.error}>Widget not found</div>;
  }

  return (
    <div className={s.container}>
      {status === 'loading' && (
        <div className={s.overlay}><div className={s.spinner} /></div>
      )}
      {status === 'error' && (
        <div className={s.overlay}>
          <p>加载失败</p>
          <button className={s.retryBtn} onClick={retry}>重试</button>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className={s.iframe}
        src={iframeSrc || undefined}
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        style={{ opacity: status === 'ready' ? 1 : 0 }}
      />
    </div>
  );
}
