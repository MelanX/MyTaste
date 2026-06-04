// Shared class strings (ported from styles.module.css)
export const labelClass = 'block text-[1.2rem] font-semibold text-fg';
export const pillBase =
  'cursor-pointer rounded-[5rem] border border-line bg-bg-alt px-[14px] py-[6px] text-[0.9rem] text-fg-muted hover:bg-accent-dark';
export const pillActive = 'border-accent-dark bg-accent text-white';
export const addButtonClass =
  'flex h-8 w-8 flex-[0_0_auto] cursor-pointer items-center justify-center self-center rounded-full border-none p-0 max-[600px]:self-end';
export const ingredientInputClass = 'rounded-[0.25rem] border border-line-soft px-[0.4rem] py-[0.3rem] text-[0.9rem]';
export const sectionAddRowClass = 'grid grid-cols-[1fr_auto] items-center gap-[0.4rem]';
export const sectionAddInputsClass = 'grid min-w-0 grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] items-center gap-2';
export const sectionAddActionsClass = 'flex items-center justify-end gap-[0.4rem] whitespace-nowrap';
export const sectionDeleteButtonClass =
  'ml-auto h-8 cursor-pointer rounded-[2rem] border-none bg-danger px-3 py-[0.35rem] text-[0.85rem] font-medium text-white hover:bg-danger-strong';

export const ingredientsTableClass =
  'my-2 max-h-[20rem] overflow-y-auto rounded-[4px] border border-line bg-surface p-[10px] shadow-[0_2px_6px_var(--color-shadow-soft)]';
export const ingredientRowClass = 'relative flex cursor-move items-center gap-2 rounded-[0.25rem] px-[0.4rem] py-[0.3rem] hover:bg-bg';
export const ingredientRowDropBeforeClass =
  "before:absolute before:-top-[0.125rem] before:right-0 before:left-0 before:h-[0.125rem] before:rounded-[62.5rem] before:bg-accent before:content-['']";
export const removeButtonClass =
  'mr-[0.6rem] flex h-[1.7rem] w-[1.7rem] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-danger p-0 text-[1.2rem] leading-none text-white transition-colors hover:bg-danger-strong disabled:cursor-not-allowed disabled:bg-disabled';
export const dropZoneClass =
  'mt-[0.3rem] rounded-[0.25rem] border border-dashed border-line-soft px-[0.4rem] py-1 text-[0.75rem] text-fg-subtle';
export const dropZoneActiveClass = 'border-accent bg-accent-soft text-fg-subtle';
