import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bug, Sparkles, MessageCircle, FileText, Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { useFeedbackStore, IssueType, Priority } from '@/stores/feedbackStore';
import { cn } from '@/lib/utils';

interface ReportIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ISSUE_TYPES: { type: IssueType; icon: typeof Bug; label: string }[] = [
  { type: 'bug', icon: Bug, label: 'Bug' },
  { type: 'feature', icon: Sparkles, label: 'Feature' },
  { type: 'question', icon: MessageCircle, label: 'Question' },
  { type: 'other', icon: FileText, label: 'Other' },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const PLACEHOLDERS: Record<IssueType, string> = {
  bug: 'What happened? What did you expect?',
  feature: 'Describe the feature you\'d like',
  question: 'What would you like to know?',
  other: 'Provide details about your feedback',
};

export function ReportIssueDialog({ isOpen, onClose }: ReportIssueDialogProps) {
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-[380px] max-h-[90vh] bg-surface rounded-xl shadow-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
              <h2 className="font-semibold">Report Issue</h2>
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
                      <h3 className="font-semibold mb-2">Issue Reported!</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Thank you for your feedback.
                      </p>
                      {result.url && (
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on GitHub
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
                        Try again
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* Form View */
                <>
                  {/* Issue Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Issue Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {ISSUE_TYPES.map(({ type, icon: Icon, label }) => (
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
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Title <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                      placeholder="Brief description of the issue"
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
                      Description <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                      placeholder={PLACEHOLDERS[issueType]}
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
                        Steps to Reproduce
                      </label>
                      <textarea
                        value={steps}
                        onChange={(e) => setSteps(e.target.value.slice(0, 1000))}
                        placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
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
                    <label className="text-xs font-medium text-muted-foreground">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className={cn(
                        'w-full px-3 py-2 text-sm rounded-md',
                        'bg-background border border-border',
                        'focus:outline-none focus:ring-1 focus:ring-accent'
                      )}
                    >
                      {PRIORITIES.filter((p) => issueType === 'bug' || p.value !== 'critical').map(
                        ({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
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
                    <span className="text-sm">Include system information</span>
                  </label>
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
                  Cancel
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
                      Submitting...
                    </>
                  ) : (
                    'Submit'
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
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
