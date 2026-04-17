# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Skills Directory Overview

This directory contains two skill packages that extend Claude Code's capabilities for this CRM project.

---

## 1. `ui-ux-pro-max` — Design Intelligence Skill

Python-based design system generator with databases of 67 styles, 96 palettes, 57 font pairings, 25 chart types across 13 stacks.

### When to use
Invoke when building any UI: components, pages, dashboards, landing pages — especially for design decisions (colors, typography, layout, style).

### Workflow

```bash
# Step 1: Generate full design system (always start here)
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<product_type> <keywords>" --design-system -p "Project Name"

# Step 2 (optional): Domain-specific search
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain>
# Domains: product, style, typography, color, landing, chart, ux, react, web, prompt

# Step 3 (optional): Stack-specific guidelines
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack nextjs
# Stacks: html-tailwind (default), react, nextjs, vue, svelte, shadcn, swiftui, react-native, flutter, jetpack-compose

# Persist design system across sessions
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
# Creates: design-system/MASTER.md + design-system/pages/<page>.md (with --page flag)
```

### For this CRM project
Default query: `"crm saas dashboard dark professional"` with `--stack nextjs` or `--stack shadcn`.

### Pre-delivery UI checklist
- No emojis as icons — use SVG (Heroicons/Lucide)
- All clickable elements have `cursor-pointer`
- Hover transitions 150–300ms
- Light/dark mode contrast verified (4.5:1 minimum)
- Responsive at 375px, 768px, 1024px, 1440px
- No content hidden behind fixed navbars

---

## 2. `06-developer-experience` — DX Subagents Pack

Collection of 13 specialized subagent definitions (VoltAgent Community, MIT). Each `.md` file is a subagent prompt to use via `Agent` tool.

### Available subagents

| File | Use for |
|------|---------|
| `build-engineer.md` | Build optimization, caching, monorepo builds |
| `cli-developer.md` | CLI tools, DevOps scripts, argument parsing |
| `dependency-manager.md` | Package updates, version conflicts, security |
| `documentation-engineer.md` | API docs, developer guides, doc sites |
| `dx-optimizer.md` | Workflow analysis, productivity bottlenecks |
| `git-workflow-manager.md` | Branching strategies, Git automation |
| `legacy-modernizer.md` | Incremental refactoring, framework migration |
| `mcp-developer.md` | MCP servers, AI tool integrations |
| `readme-generator.md` | Repository READMEs from actual source files |
| `refactoring-specialist.md` | Design patterns, code smells, safe refactoring |
| `powershell-module-architect.md` | PowerShell modules, profiles |
| `powershell-ui-architect.md` | WinForms/WPF/TUI for PowerShell tooling |
| `slack-expert.md` | Slack bots, Block Kit, OAuth, Events API |
| `tooling-engineer.md` | IDE config, linters, formatters, dev environments |

### How to invoke
Pass the `.md` file content as the system prompt when spawning an `Agent` tool call, or reference by name in subagent tasks.
