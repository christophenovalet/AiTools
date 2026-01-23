Create a commit with an auto-generated message.

Steps:
1. Run `git status` and `git diff` to see all changes.
2. Generate a concise commit message summarizing the changes (1-2 sentences, focus on "why" not "what").
3. Stage all changed files with `git add -A`.
4. Commit with the generated message.
5. If the user passed `-sync` as an argument, also run `git push` to sync with remote.
