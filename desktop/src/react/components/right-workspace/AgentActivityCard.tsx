/**
 * AgentActivityCard — 右侧「后台动态」卡片
 *
 * 消费统一 Agent Activity 真相源（agentActivitiesBySession），按当前对话 sessionPath
 * 展示 subagent / workflow / 巡检 的实时状态。无活动时返回 null（desk 撑满）。
 */
import { useStore } from '../../stores';
import { selectAgentActivities, type AgentActivityEntry } from '../../stores/agent-activity-slice';
import styles from './AgentActivityCard.module.css';

const KIND_LABEL: Record<AgentActivityEntry['kind'], string> = {
  subagent: '子助手',
  workflow: 'Workflow',
  heartbeat: '巡检',
  cron: '定时',
};

function rank(status: AgentActivityEntry['status']): number {
  return status === 'running' ? 0 : 1; // 运行中优先
}

export function AgentActivityCard() {
  const sessionPath = useStore((s) => s.currentSessionPath);
  const activities = useStore(selectAgentActivities(sessionPath));
  const t = window.t ?? ((k: string) => k);

  if (!activities.length) return null;

  const sorted = [...activities].sort((a, b) => {
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    return (b.startedAt ?? 0) - (a.startedAt ?? 0);
  });

  return (
    <section className={`jian-card ${styles.card}`} aria-label={t('rightWorkspace.activity.title')}>
      <div className={styles.header}>
        <span className={styles.title}>{t('rightWorkspace.activity.title')}</span>
        <span className={styles.count}>{sorted.length}</span>
      </div>
      <div className={styles.list}>
        {sorted.map((a) => (
          <div key={a.id} className={styles.row} data-status={a.status}>
            <span className={`${styles.dot} ${styles[`dot-${a.status}`] ?? ''}`} aria-hidden="true" />
            <span className={styles.name} title={a.agentName || a.agentId || ''}>
              {a.agentName || a.agentId || KIND_LABEL[a.kind] || a.kind}
            </span>
            <span className={styles.summary} title={a.summary || ''}>{a.summary || ''}</span>
            <span className={styles.kind}>{KIND_LABEL[a.kind] || a.kind}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
