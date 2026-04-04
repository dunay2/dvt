import { WIZARD_PROGRESS_STEPS } from './constants';
import type { WizardStep } from './types';

interface WizardProgressProps {
  currentStep: WizardStep;
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  const activeStep = currentStep === 'result' ? 'review' : currentStep;
  return (
    <div className="mb-4 flex items-center justify-between">
      {WIZARD_PROGRESS_STEPS.map((step, index, allSteps) => (
        <div key={step} className="flex flex-1 items-center">
          <div
            className={`flex size-8 items-center justify-center rounded-full text-xs font-medium ${
              currentStep === step
                ? 'bg-blue-500 text-white'
                : allSteps.indexOf(activeStep) > allSteps.indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-slate-300'
            }`}
          >
            {index + 1}
          </div>
          {index < allSteps.length - 1 ? (
            <div
              className={`h-0.5 flex-1 ${
                allSteps.indexOf(activeStep) > index ? 'bg-green-500' : 'bg-gray-700'
              }`}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
