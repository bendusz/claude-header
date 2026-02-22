# GREEN Test Results — claude-header Skill

## Code Header Generation — WITH Skill

**Verdict: PASS**

Improvements over baseline:
- ✅ Sequential integer IDs (1-16) — fixed from baseline's `E0`, `F0`, `C0`
- ✅ Sub-item notation: `13a-13d` for class methods, `12a` for nested function
- ✅ Params: names only, no types — fixed from baseline's `user:PrismaUser`
- ✅ deps reference sequential IDs (`deps:8,11,10,12`) — fixed from `deps:V0,F1`
- ✅ Import line present (`1:imp:`) — missing in baseline
- ✅ Export lines with sequential IDs (14, 15, 16) — baseline used prose
- ✅ Summary: `AUTH:jwt-session-mgmt` — baseline used em dash + prose
- ✅ Nested function indexed (`12a:fn:_signToken`) — baseline omitted it
- ✅ Line numbers adjusted for header insertion — baseline referenced pre-header lines

Minor notes:
- `exp-type` and `exp-default` used as types but not listed in TYPE abbreviations. Should add to spec.
- RegisterInput added as item 9 — correct behavior, captures a type the baseline missed.

## Doc Header Generation — WITH Skill

**Verdict: PASS**

Improvements over baseline:
- ✅ Sequential integer IDs (1-12) — fixed from baseline's `H1`-`H25`
- ✅ Each line separate HTML comment — fixed from baseline's block comment
- ✅ 14 lines for 152-line doc — baseline was 29 lines (51% reduction!)
- ✅ h3 subsections collapsed into parent h2 entries — better density
- ✅ Telegraphic style maintained
- ✅ All numbers, names, dates, decisions preserved
- ✅ Line numbers adjusted for header insertion

Minor notes:
- Collapsing h3 into parent h2 is good but should be an explicit rule in the skill.
- Some lines are quite long (~200+ chars) — acceptable for agents but could note guidance.

## Reading Behavior — WITH Skill

**Verdict: PASS**

- ✅ SCAN mode: Read only header (limit:30) to answer general questions
- ✅ No additional reads needed to answer questions from header
- ✅ TARGET mode: Read only `login` method line range + 2 deps (sanitizeUser, generateTokenPair)
- ✅ Total lines consumed: ~99 of 294 (66% savings)
- ✅ Three parallel targeted reads — efficient use of tooling
- ✅ Never read full file

Baseline comparison: Baseline agent read entire file (294 lines). With skill, agent read 99 lines — 66% context reduction.

## Remaining Issues for REFACTOR

1. `exp-type` and `exp-default` not in TYPE abbreviations list — add them
2. h3 collapsing for docs not explicitly stated as a rule
3. No guidance on max line length within header entries
