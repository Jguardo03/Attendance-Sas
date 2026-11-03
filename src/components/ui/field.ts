// The look every input shares (Student UI style sheet, "Inputs and errors"): 44 high, radius 12, a hairline border that
// turns blue when focused and red when there is an error. Class names are written out in full so the styling tool
// can see them.
export const fieldBox = 'min-h-11 flex-row items-center justify-between rounded-button border bg-surface px-3';

/** The border colour class for a field: red with an error, the normal grey otherwise. */
export const fieldBorder = (error?: string) => (error ? 'border-danger' : 'border-border');
