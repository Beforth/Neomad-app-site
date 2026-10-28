import type { FormulaMeta } from '../../lib/hrmsPayroll';

/** What each function does, with an example a payroll person can copy. */
const FUNCTIONS: { name: string; what: string; example: string }[] = [
  { name: 'IF(test, a, b)', what: 'a when the test is true, otherwise b', example: 'IF(basic > pf_wage_cap, pf_wage_cap * 12%, basic * 12%)' },
  { name: 'ROUND(x, places)', what: 'rounds x to that many decimal places (0 to 4)', example: 'ROUND(basic * 35%, 2)' },
  { name: 'MAX(a, b, ...)', what: 'the biggest of the numbers', example: 'MAX(basic, gross * 50%)' },
  { name: 'MIN(a, b, ...)', what: 'the smallest of the numbers', example: 'MIN(basic, 15000) * 12%' },
  { name: 'ABS(x)', what: 'x without its minus sign', example: 'ABS(gross - ctc)' },
  { name: 'FLOOR(x) / CEIL(x)', what: 'rounds down / up to a whole number', example: 'FLOOR(gross / 100) * 100' },
  { name: 'AND, OR, NOT', what: 'combine tests inside IF', example: 'IF(gross > 15000 AND days >= 20, 200, 0)' },
  { name: '12%', what: 'a percent: 12% means 0.12', example: 'basic * 12%' },
  { name: '< > <= >= = <>', what: 'compare two numbers (<> means not equal)', example: 'IF(days = 26, 500, 0)' },
];

/**
 * A reference for writing formulas: the functions, every name by the line it can be
 * used from, and how each built-in line is worked out today. Names are clickable when
 * `onPick` is given, to drop them into the box being edited.
 */
export default function FormulaHelp({ meta, onPick }: { meta: FormulaMeta; onPick?: (name: string) => void }) {
  return (
    <div className="space-y-5 text-[13px]">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Functions and symbols</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody>
              {FUNCTIONS.map((f) => (
                <tr key={f.name} className="border-b border-border/60 align-top">
                  <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-[12px]">{f.name}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{f.what}</td>
                  <td className="py-1.5 font-mono text-[12px]">{f.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Use + - * / and brackets as in a spreadsheet. A line can only use names that are worked out above it.</p>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Names you can use</h3>
        <div className="space-y-3">
          {meta.variables.map((g) => (
            <div key={g.group}>
              <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{g.group}</p>
              <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {Object.entries(g.names).map(([name, text]) => (
                  <div key={name} className="flex items-baseline gap-2">
                    {onPick ? (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onPick(name)}
                        className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] hover:bg-accent"
                      >{name}</button>
                    ) : (
                      <code className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[11px]">{name}</code>
                    )}
                    <span className="text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">How each line is worked out now</h3>
        <p className="mb-1 text-[11px] text-muted-foreground">Type a formula under the same name to replace it. These are the built-in formulas.</p>
        <table className="w-full text-left">
          <tbody>
            {meta.lines.map((l) => (
              <tr key={l.key} className="border-b border-border/60 align-top">
                <td className="whitespace-nowrap py-1.5 pr-3">{l.label} <code className="text-[11px] text-muted-foreground">{l.key}</code></td>
                <td className="py-1.5 font-mono text-[12px]">{l.default}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
