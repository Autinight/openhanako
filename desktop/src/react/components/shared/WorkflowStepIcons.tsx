interface StepIconProps {
  size?: number;
  className?: string;
}

export function ParallelStepIcon({ size = 16, className }: StepIconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 1.5 L14.5 8 L8 14.5 L1.5 8 Z" />
    </svg>
  );
}

export function PipelineStepIcon({ size = 16, className }: StepIconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" />
    </svg>
  );
}

export function LogStepIcon({ size = 16, className }: StepIconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2 L14.5 13 L1.5 13 Z" />
    </svg>
  );
}
