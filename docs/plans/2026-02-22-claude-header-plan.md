# claude-header Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a skill that generates ultra-dense file headers to reduce agent context window consumption.

**Architecture:** Single SKILL.md file in `~/.claude/skills/claude-header/`. No supporting scripts needed — the skill is pure instructions for the agent. Follows writing-skills TDD: baseline test → write skill → close loopholes.

**Tech Stack:** Markdown skill document, subagent testing

---

### Task 1: Create test fixtures

**Files:**
- Create: `test-fixtures/sample-code.ts` (a ~200 line TypeScript file with classes, functions, imports, exports)
- Create: `test-fixtures/sample-doc.md` (a ~150 line business document with headings, numbers, decisions)

**Step 1: Create sample TypeScript file**

Create a realistic 200-line TS file with:
- Multiple imports
- 2-3 standalone functions that call each other
- 1 class with 3-4 methods
- Type/interface definitions
- Mixed export styles
- Some functions with non-obvious names needing notes

**Step 2: Create sample business document**

Create a realistic 150-line markdown doc with:
- Multiple heading levels (h1-h3)
- Financial data, dates, percentages
- Named entities (companies, products)
- Decision points and conclusions
- Narrative paragraphs (to test condensation)

**Step 3: Commit**

```bash
git add test-fixtures/
git commit -m "feat: add test fixtures for skill testing"
```

---

### Task 2: RED — Baseline test without skill

**Purpose:** See what an agent does when asked to "create a claude-header" for these files WITHOUT the skill loaded. Document exact behavior.

**Step 1: Run baseline scenario for code file**

Spawn a subagent with this prompt (NO skill loaded):
```
Read the file at test-fixtures/sample-code.ts. Create a "claude-header" comment block at the top of this file. The header should be an ultra-dense index of the file's contents — function names, line ranges, dependencies between items, return types. Use the format: ID:TYPE:name(params)[lines]->return deps:N,N. Wrap in // @claude-header v1 / // @end-claude-header delimiters. Be as token-efficient as possible. This header is for AI agents, not humans.
```

Document:
- Did it follow the format correctly?
- Did it miss any symbols?
- Was it token-efficient or verbose?
- Did it add unnecessary prose/explanation?
- Did it get line numbers right?

**Step 2: Run baseline scenario for doc file**

Spawn a subagent with this prompt (NO skill loaded):
```
Read the file at test-fixtures/sample-doc.md. Create a "claude-header" HTML comment block at the top that condenses the entire document content into an ultra-dense format. Use heading references with line numbers and semicolon-separated key facts. Format: ID:hN:Heading[line];fact1;fact2. Telegraphic style — drop articles, prepositions, narrative. Preserve all numbers, names, dates, decisions. Max ~100 lines. Wrap in <!-- @claude-header v1 --> / <!-- @end-claude-header -->. This is for AI agents, not humans.
```

Document same issues.

**Step 3: Run baseline "reading" scenario**

Spawn a subagent with this prompt:
```
Read the file at test-fixtures/sample-code.ts. It has a @claude-header block at the top. Using ONLY the header, answer: What functions does this file export? What class does it contain? What does function X depend on? Do NOT read past the @end-claude-header line.
```

Document: Did the agent respect the "don't read past header" instruction without the skill's authority?

**Step 4: Document all baseline findings**

Write findings to `docs/plans/baseline-findings.md`. Record:
- Exact rationalizations used
- Format violations
- Verbosity issues
- Reading behavior compliance

**Step 5: Commit**

```bash
git add docs/plans/baseline-findings.md
git commit -m "test: document baseline behavior without skill"
```

---

### Task 3: GREEN — Write the SKILL.md

**Files:**
- Create: `~/.claude/skills/claude-header/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p ~/.claude/skills/claude-header
```

**Step 2: Write SKILL.md**

Write the skill document addressing all baseline failures found in Task 2. The skill must include:

1. **Frontmatter** — name: `claude-header`, description starting with "Use when..."
2. **Overview** — one-sentence core principle
3. **When to Use** — triggering conditions (user asks to add/update headers)
4. **Header Format Spec** — the full format from the design doc
5. **Code example** — the auth manager example
6. **Doc example** — the business plan example
7. **Agent Reading Behavior** — the 3 modes (scan/target/full) with decision flow
8. **Generation Rules** — comment syntax table, ordering, include/exclude, line number accuracy
9. **Doc Condensation Techniques** — telegraphic style, key-value, max size rules
10. **Large Document Handling** — chunking threshold, agent handoff process
11. **Scope Rules** — skip thresholds, update = regenerate, file-level isolation
12. **Common Mistakes** — based on baseline failures

Key constraints:
- Keep under 500 words (it's a skill, not a textbook)
- Use tables and terse notation, not prose
- The examples ARE the documentation — one good code example, one good doc example
- Address specific baseline rationalizations explicitly

**Step 3: Commit**

```bash
git add ~/.claude/skills/claude-header/SKILL.md
git commit -m "feat: create claude-header skill"
```

---

### Task 4: GREEN — Test skill compliance

**Step 1: Re-run code generation scenario WITH skill**

Same subagent prompt as Task 2 Step 1, but now the skill is loaded. Compare output against baseline.

Check:
- Format compliance (exact notation)
- Token efficiency (shorter than baseline?)
- Completeness (all symbols captured?)
- Line number accuracy

**Step 2: Re-run doc generation scenario WITH skill**

Same prompt as Task 2 Step 2 with skill loaded. Compare.

Check:
- Telegraphic style compliance
- Data preservation (numbers, names, dates)
- Narrative dropped
- Size within limits

**Step 3: Re-run reading behavior scenario WITH skill**

Same prompt as Task 2 Step 3 with skill loaded. Compare.

Check:
- Did agent stop at @end-claude-header?
- Did it answer questions from header alone?
- Did it correctly identify when it would need to escalate to Mode 2?

**Step 4: Document results**

Write to `docs/plans/green-test-results.md`. Note any remaining issues.

**Step 5: Commit**

```bash
git add docs/plans/green-test-results.md
git commit -m "test: document skill compliance results"
```

---

### Task 5: REFACTOR — Close loopholes

**Step 1: Identify new rationalizations**

Review green-test-results.md for any cases where the agent:
- Partially complied but rationalized deviations
- Added extra prose/explanations
- Didn't condense docs aggressively enough
- Read past the header when it shouldn't have

**Step 2: Update SKILL.md**

Add explicit counters for each new rationalization found. Possible additions:
- Rationalization table
- Red flags list
- Tighter format constraints

**Step 3: Re-test**

Run the scenarios again. Verify compliance improved.

**Step 4: Commit**

```bash
git add ~/.claude/skills/claude-header/SKILL.md
git commit -m "refactor: close loopholes in skill based on testing"
```

---

### Task 6: Final verification & deploy

**Step 1: Run a novel test**

Find or create a different code file (not the test fixture) and ask the agent to header it. Verify it generalizes beyond the examples.

**Step 2: Word count check**

```bash
wc -w ~/.claude/skills/claude-header/SKILL.md
```

Target: under 500 words.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: claude-header skill complete and tested"
```
