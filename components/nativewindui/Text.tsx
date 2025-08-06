import { cssInterop } from 'nativewind';
import * as React from 'react';
import { UITextView } from 'react-native-uitextview';

import { cn } from '~/lib/cn';

cssInterop(UITextView, { className: 'style' });

/**
 * Standard Tailwind Text Sizing Guide:
 * 
 * Headers:
 * - text-2xl font-bold (24px) - Main page titles (h1)
 * - text-lg font-semibold (18px) - Section headers (h2)
 * - text-base font-semibold (16px) - Subsection headers (h3)
 * 
 * Body Text:
 * - text-lg (18px) - Large body text
 * - text-base (16px) - Regular body text (default)
 * - text-sm (14px) - Small body text
 * 
 * Captions:
 * - text-xs (12px) - Small captions (rarely used)
 * 
 * Usage: <Text className="text-lg font-bold">Title</Text>
 */

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof UITextView>) {
  const textClassName = React.useContext(TextClassContext);
  return (
    <UITextView
      className={cn('text-foreground', textClassName, className)}
      {...props}
    />
  );
}

export { Text, TextClassContext };
