import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './FloatingActions.module.css';
import {
  dispatchCoverNotice,
  requestMarkdownCoverGeneration,
} from '../../utils/markdown-cover-generation';
import { hanaFetch } from '../../hooks/use-hana-fetch';
import { useStore } from '../../stores';

interface Props {
  content: string;
  filePath?: string;
  contentType?: string;
  language?: string | null;
  showMarkdownPreviewToggle?: boolean;
  markdownPreviewActive?: boolean;
  onToggleMarkdownPreview?: () => void;
}

export function FloatingActions({
  content,
  filePath,
  contentType,
  language,
  showMarkdownPreviewToggle = false,
  markdownPreviewActive = false,
  onToggleMarkdownPreview,
}: Props) {
  const [copyLabel, setCopyLabel] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverToolEnabled, setCoverToolEnabled] = useState(false);
  const currentAgentId = useStore(s => s.currentAgentId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  useEffect(() => {
    if (contentType !== 'markdown' || !filePath || !currentAgentId) {
      setCoverToolEnabled(false);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({ agentId: currentAgentId });
    hanaFetch(`/api/desk/beautify/status?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setCoverToolEnabled(Boolean(data?.available && data?.enabled));
      })
      .catch(() => {
        if (!cancelled) setCoverToolEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contentType, currentAgentId, filePath]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      const _t = window.t ?? ((p: string) => p);
      setCopyLabel(_t('attach.copied'));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopyLabel(null), 1500);
    });
  }, [content]);

  const handleScreenshot = useCallback(async () => {
    const { takeArticleScreenshot } = await import('../../utils/screenshot');
    await takeArticleScreenshot(content, {
      filePath,
      articleType: contentType,
      language,
    });
  }, [content, contentType, filePath, language]);

  const handleGenerateCover = useCallback(async () => {
    if (!filePath || contentType !== 'markdown') return;
    setCoverBusy(true);
    try {
      const result = await requestMarkdownCoverGeneration({ filePath });
      dispatchCoverNotice(
        result.ok ? '已创建 cover 后台任务。' : `Cover 生成失败：${result.error}`,
        result.ok ? 'success' : 'error',
      );
    } catch (err) {
      dispatchCoverNotice(`Cover 生成失败：${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setCoverBusy(false);
    }
  }, [contentType, filePath]);

  const t = window.t ?? ((p: string) => p);

  return (
    <div className={styles.floatingActions} data-react-managed>
      <button className={styles.actionBtn} onClick={handleCopy}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>{copyLabel ?? t('attach.copy')}</span>
      </button>
      {contentType === 'markdown' && filePath && coverToolEnabled && (
        <button
          className={`${styles.actionBtn}${coverBusy ? ` ${styles.actionBtnBusy}` : ''}`}
          onClick={handleGenerateCover}
          title="生成 cover"
          aria-label="生成 cover"
          disabled={coverBusy}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h5l10-10a3 3 0 0 0-5-5L4 15v5z" />
            <path d="M13.5 6.5l4 4" />
            <path d="M4 15l5 5" />
          </svg>
        </button>
      )}
      {showMarkdownPreviewToggle && (
        <button
          className={`${styles.actionBtn}${markdownPreviewActive ? ` ${styles.actionBtnActive}` : ''}`}
          onClick={onToggleMarkdownPreview}
          title={t(markdownPreviewActive ? 'preview.exitMarkdownPreview' : 'preview.markdownPreview')}
          aria-label={t('preview.markdownPreview')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}
      <button className={styles.actionBtn} onClick={handleScreenshot} title={t('common.screenshot')} aria-label={t('common.screenshot')}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>
    </div>
  );
}
