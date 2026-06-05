import React from 'react';
import renderInlineMarkdown from '../../utils/renderInlineMarkdown';

interface RecipeInstructionsProps {
  instructions: string[];
}

const RecipeInstructions: React.FC<RecipeInstructionsProps> = ({ instructions }) => {
  return (
    <div className="mb-5 rounded-lg bg-surface p-3 shadow-[0_4px_8px_var(--color-shadow-soft)] md:p-4 print:border print:border-line">
      <h3 className="mt-0 mb-4 text-[1.3rem] font-semibold text-fg">Zubereitung</h3>
      <div className="flex flex-col gap-4">
        {instructions.map((paragraph, index) => (
          <div
            key={index}
            className="grid grid-cols-[30px_1fr] items-center gap-1 print:break-inside-avoid md:grid-cols-[40px_1fr] md:gap-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[0.9rem] font-semibold text-white md:h-[34px] md:w-[34px] md:text-base">
              {index + 1}
            </div>
            <div className="break-words py-1 text-fg">{renderInlineMarkdown(paragraph)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecipeInstructions;
