import { CheckCircle2 } from 'lucide-react';

const ANSWERS = [
  'First class is always free',
  'No long-term contracts',
  'Background-checked instructors',
];

export function QuickAnswerStrip() {
  return (
    <div className="bg-primary/5 border-y border-primary/10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 sm:gap-8">
          {ANSWERS.map((answer) => (
            <div key={answer} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">
                {answer}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
