<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:docs-auto-commit-rules -->
# Documentation updates

When an agent changes any file under `docs/`, it must commit and push those documentation changes before ending the turn, unless the user explicitly asks not to commit or push.

Use a focused commit that includes only the relevant documentation files changed for the current request. Do not include unrelated worktree changes.
<!-- END:docs-auto-commit-rules -->

<!-- BEGIN:notion-work-status-rules -->
# Work status updates

When starting something new, changing focus, hitting a blocker, or finishing a meaningful unit of work, update both the local workspace state and the Notion status board.

- Local updates should be reflected in the relevant project files, docs, task notes, or git-visible changes for the work being performed.
- Notion updates should describe what is being worked on, the current status, blockers, and any useful notes.
- If the Notion connector or page is unavailable, note that in the final response and include the status update text that should be copied into Notion.
<!-- END:notion-work-status-rules -->
