import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bug, Sparkles, MessageCircle, FileText, Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { useFeedbackStore, IssueType, Priority } from '@/stores/feedbackStore';
import { cn } from '@/lib/utils';

interface ReportIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ISSUE_TYPE_KEYS: Record<IssueType, string> = {
  bug: 'feedback.type.bug',
  feature: 'feedback.type.feature',
  question: 'feedback.type.question',
  other: 'feedback.type.other',
};

const ISSUE_TYPE_ICONS: Record<IssueType, typeof Bug> = {
  bug: Bug,
  feature: Sparkles,
  question: MessageCircle,
  other: FileText,
};

const PRIORITY_KEYS: Record<Priority, string> = {
  low: 'feedback.priority.low',
  medium: 'feedback.priority.medium',
  high: 'feedback.priority.high',
  critical: 'feedback.priority.critical',
};

const PLACEHOLDER_KEYS: Record<IssueType, string> = {
  bug: 'feedback.placeholder.bug',
  feature: 'feedback.placeholder.feature',
  question: 'feedback.placeholder.question',
  other: 'feedback.placeholder.other',
};

export function ReportIssueDialog({ isOpen, onClose }: ReportIssueDialogProps) {
  const { t } = useTranslation();
  const [issueType, setIssueType] = useState<IssueType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [includeSystemInfo, setIncludeSystemInfo] = useState(true);
  const [result, setResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  const { isSubmitting, submitIssue } = useFeedbackStore();

  const resetForm = () => {
    setIssueType('bug');
    setTitle('');
    setDescription('');
    setSteps('');
    setPriority('medium');
    setIncludeSystemInfo(true);
    setResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;

    const submitResult = await submitIssue({
      type: issueType,
      title: title.trim(),
      description: description.trim(),
      steps: issueType === 'bug' ? steps.trim() : undefined,
      priority,
      includeSystemInfo,
    });

    setResult(submitResult);
  };

  const isValid = title.trim().length >= 5 && description.trim().length >= 20;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 rounded-lg overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-[380px] max-h-[90vh] bg-surface rounded-xl shadow-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
              <h2 className="font-semibold">{t('feedback.title')}</h2>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {result ? (
                /* Result View */
                <div className="flex flex-col items-center py-6 text-center">
                  {result.success ? (
                    <>
                      <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                      <h3 className="font-semibold mb-2">{t('feedback.success.title')}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('feedback.success.thanks')}
                      </p>
                      {result.url && (
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {t('feedback.success.viewOnGithub')}
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                      <h3 className="font-semibold mb-2">Failed to Report</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {result.error}
                      </p>
                      <button
                        onClick={() => setResult(null)}
                        className="text-sm text-accent hover:underline cursor-pointer"
                      >
                        {t('common.tryAgain')}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* Form View */
                <>
                  {/* Issue Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('feedback.issueType')}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(ISSUE_TYPE_KEYS) as IssueType[]).map((type) => {
                        const Icon = ISSUE_TYPE_ICONS[type];
                        return (
                          <button
                            key={type}
                            onClick={() => setIssueType(type)}
                            className={cn(
                              'flex flex-col items-center gap-1 py-2 rounded-md text-xs transition-colors cursor-pointer',
                              issueType === type
                                ? 'bg-accent text-white'
                                : 'bg-surface-hover text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            {t(ISSUE_TYPE_KEYS[type])}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t('feedback.titleLabel')} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                      placeholder={t('feedback.titlePlaceholder')}
                      className={cn(
                        'w-full px-3 py-2 text-sm rounded-md',
                        'bg-background border border-border',
                        'focus:outline-none focus:ring-1 focus:ring-accent'
                      )}
                    />
                    <p className="text-xs text-muted-foreground">{title.length}/100</p>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t('feedback.descriptionLabel')} <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                      placeholder={t(PLACEHOLDER_KEYS[issueType])}
                      rows={3}
                      className={cn(
                        'w-full px-3 py-2 text-sm rounded-md resize-none',
                        'bg-background border border-border',
                        'focus:outline-none focus:ring-1 focus:ring-accent'
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      {description.length}/2000 (min 20)
                    </p>
                  </div>

                  {/* Steps (only for bugs) */}
                  {issueType === 'bug' && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {t('feedback.stepsLabel')}
                      </label>
                      <textarea
                        value={steps}
                        onChange={(e) => setSteps(e.target.value.slice(0, 1000))}
                        placeholder={t('feedback.stepsPlaceholder')}
                        rows={3}
                        className={cn(
                          'w-full px-3 py-2 text-sm rounded-md resize-none',
                          'bg-background border border-border',
                          'focus:outline-none focus:ring-1 focus:ring-accent'
                        )}
                      />
                    </div>
                  )}

                  {/* Priority */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('feedback.priorityLabel')}</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className={cn(
                        'w-full px-3 py-2 text-sm rounded-md',
                        'bg-background border border-border',
                        'focus:outline-none focus:ring-1 focus:ring-accent'
                      )}
                    >
                      {(Object.keys(PRIORITY_KEYS) as Priority[])
                        .filter((p) => issueType === 'bug' || p !== 'critical')
                        .map((value) => (
                          <option key={value} value={value}>
                            {t(PRIORITY_KEYS[value])}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Include System Info */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeSystemInfo}
                      onChange={(e) => setIncludeSystemInfo(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="text-sm">{t('feedback.includeSystemInfo')}</span>
                  </label>

                  {/* Screenshot hint */}
                  <p className="text-[10px] text-muted-foreground">
                    {t('feedback.screenshotHint')}
                  </p>
                </>
              )}
            </div>

            {/* Footer */}
            {!result ? (
              <div className="flex gap-2 p-4 border-t border-border/50 shrink-0">
                <button
                  onClick={handleClose}
                  className={cn(
                    'flex-1 py-2 text-sm rounded-md transition-colors cursor-pointer',
                    'bg-surface-hover text-foreground hover:bg-border'
                  )}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!isValid || isSubmitting}
                  className={cn(
                    'flex-1 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2',
                    'bg-accent text-white',
                    isValid && !isSubmitting ? 'hover:bg-accent/90 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('common.submitting')}
                    </>
                  ) : (
                    t('common.submit')
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 border-t border-border/50 shrink-0">
                <button
                  onClick={handleClose}
                  className={cn(
                    'w-full py-2 text-sm rounded-md transition-colors cursor-pointer',
                    'bg-surface-hover text-foreground hover:bg-border'
                  )}
                >
                  {t('common.close')}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
