<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:docs-auto-commit-rules -->
# Documentation updates

When an agent changes any file under `docs/`, it must commit and push those documentation changes before ending the turn, unless the user explicitly asks not to commit or push.

Use a focused commit that includes only the relevant documentation files changed for the current request. Do not include unrelated worktree changes.
<!-- END:docs-auto-commit-rules -->
