# AI Workflow – White-Label Search Project

## Source of Truth

- The canonical codebase will live in a single Git repo.
- All actual edits will happen in VS Code on the local clone of this repo.
- GitHub mirrors whatever is committed and pushed from VS Code.

## Tools

- VS Code (primary editor)
- Gemini Code Assist (VS Code extension)
- OpenAI / Codex extension in VS Code
- ChatGPT (browser)
- Gemini (web)

## Core Rules

1. **Single copy of the repo**
   - Only one local folder for this project, e.g. `~/dev/white-label-search`.
   - VS Code always opens that folder as the workspace.

2. **Always sync before and after working**
   - Before making changes:
     - `git checkout dev` (or feature branch)
     - `git pull`
   - After a logical chunk of work:
     - `git add .`
     - `git commit -m "feat: <description>"`
     - `git push`

3. **AI never “owns” the repo**
   - Gemini Code Assist and Codex are allowed to edit files only inside the open VS Code workspace.
   - ChatGPT and Gemini (web) only produce suggestions/snippets.
   - Suggested code is manually pasted into VS Code, tested, then committed.

4. **File-scoped AI changes**
   - Prompts to AI should specify exactly which files are allowed to change.
   - Example: “Modify `web/app/search/page.tsx` and `web/components/ListingCard.tsx` only.”

5. **No side copies**
   - No separate ZIP-based working directories.
   - No editing files directly in Google Drive/Docs as if they were the live codebase.

## Working With ChatGPT (browser)

- Paste relevant file(s) or snippets from VS Code when you want analysis or refactors.
- Get revised code or new components.
- Paste back into VS Code.
- Test locally.
- Commit and push to GitHub.

## Working With Gemini (web)

- Optionally point Gemini web at the GitHub repo or a ZIP snapshot for analysis.
- Treat all output as suggestions only.
- Paste into VS Code, test, then commit and push.

## Branching Model

- `main` – stable branch
- `dev` – integration branch
- `feature/*` – individual features
  - Example: `feature/web-mvp`, `feature/backend-simplyrets`

Typical flow:

1. Create a feature branch: `git checkout -b feature/web-mvp`
2. Do work (with Gemini/Codex in VS Code).
3. Commit and push: `git commit -m "feat: web MVP layout" && git push`
4. Merge `feature/*` → `dev` after testing.
5. Merge `dev` → `main` when stable.

