@AGENTS.md

# Code Documentation Standards

Every file written in this project **must** be well-commented. Comments are not optional.

- **File-level:** A comment block at the top of every file describing what it does and its role in the architecture (e.g. which layer, what resource it handles).
- **Classes:** JSDoc block explaining what the class is responsible for and what it wraps or orchestrates.
- **Functions/methods:** JSDoc with `@param`, `@returns`, and `@throws` for every public function. One-line description minimum.
- **Inline:** Comment any non-obvious logic, HTTP status mappings, workarounds, or business rules. When in doubt, add the comment.
- This rule overrides the default "no comments" behavior. Always add comments in this project.

# Skills
- **server-module** (`.claude/skills/server-module/SKILL.md`) - scaffold a new clean-arch orchestrator client module. Trigger: `/server-module`
When the user types `/server-module`, invoke the Skill tool with `skill: "server-module"` before doing anything else.

- **client-module** (`.claude/skills/client-module/SKILL.md`) - scaffold a complete client module (table, columns, modals, forms, queries, store, provider, page) for a new resource screen. Trigger: `/client-module`
When the user types `/client-module`, invoke the Skill tool with `skill: "client-module"` before doing anything else.

- **data-table** (`.claude/skills/data-table/SKILL.md`) - scaffold a fully-featured data table for a new screen using the shared TanStack Table v8 system. Trigger: `/data-table`
When the user types `/data-table`, invoke the Skill tool with `skill: "data-table"` before doing anything else.
