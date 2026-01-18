import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    icon: Clipboard,
    title: 'Clipboard History',
    description: 'Everything you copy is saved automatically.',
  },
  {
    icon: Sparkles,
    title: 'Smart Transforms',
    description: 'Beautify JSON, decode JWT, format SQL with one click.',
  },
  {
    icon: Shield,
    title: 'Secure Vault',
    description: 'Store sensitive info encrypted with AES-256.',
  },
];

export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center"
        >
          <div className="p-4 bg-accent/10 rounded-full inline-block mb-6">
            <Icon className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{step.title}</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {step.description}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-2 mb-6 mt-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              i === currentStep ? 'bg-accent' : 'bg-surface'
            )}
          />
        ))}
      </div>

      <button
        onClick={handleNext}
        className={cn(
          'flex items-center gap-2 px-4 py-2',
          'bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors'
        )}
      >
        {currentStep < steps.length - 1 ? 'Next' : 'Get Started'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
