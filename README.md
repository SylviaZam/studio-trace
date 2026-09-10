# Studio Trace

[**Try Studio Trace**](https://studio-trace.netlify.app/)

![Studio Trace: a five step form for documenting a creative process, next to a live preview of the resulting reflection](docs/screenshot.png)

A disclosure checkbox proves nothing about judgment. Studio Trace is a one-page tool that walks a creator through five prompts—intent, the role AI played, what they accepted or rejected, what they verified, and which decisions stayed theirs—and assembles the answers into a creative process record they can copy or download as Markdown. It documents judgment, not just the tool.

## What it is not

The export is a self-report. Studio Trace does not verify identity, sources, or authorship claims, and it says so on every export. It is a structured way to reflect and disclose, not a credential or proof.

## Product decisions

- **Human-authored by design.** An early concept allowed an AI agent to populate the record. That contradicted the product's purpose, so it was replaced with a read-only interview tool. Claude can ask questions that help a creator remember and articulate decisions, but it cannot read the draft or write answers.
- **Local-first privacy.** Drafts remain in the creator's browser through `localStorage`; there is no account, upload, or backend.
- **Citable context with clear limits.** Every export identifies its limits and includes optional creator, work, version, and export-date context without presenting the record as verified proof.

## How it works

- Five short prompts, each with a one-line example and a live preview that assembles as you go.
- Everything is saved to `localStorage` in your own browser. Nothing is uploaded, and there is no backend.
- A read-only interview tool can hand back one of the five prompt questions to a host that supports it (for example, asking Claude to interview you about your process). It can only ask questions; it cannot read or write your answers.

## Why this matters for AI-enabled design

Studio Trace explores a product-design question: how might an interface encourage useful AI collaboration without allowing automation to erase the creator's judgment? The answer is not another disclosure checkbox. It is a structured account of what the creator intended, accepted, rejected, checked, and ultimately decided.

The project is also designed to support critique circles and student conversations about responsible AI collaboration. A participant can document one Claude-assisted project, compare decisions with peers, and discuss what meaningful human oversight looks like without exposing confidential work.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build
npm test         # unit tests for the export and interview logic
npm run lint      # oxlint
```

Built with React 19, Vite, and Tailwind CSS. UI primitives are stock [shadcn](https://ui.shadcn.com) components on [Base UI](https://base-ui.com).

## Pointer trail

The page uses [React Bits PixelTrail](https://reactbits.dev/animations/pixel-trail) with grid size 83, trail size 0.06, maximum age 200 ms, interpolation 3, color `#1e45fc`, and gooey filter strength 2. It sits behind the content and listens to pointer movement without intercepting clicks. The effect loads separately from the form, is disabled for reduced motion and touch-only devices, and unmounts in hidden tabs. If WebGL is unavailable, the form remains usable. Component attribution and license are in [REACT-BITS-LICENSE.md](REACT-BITS-LICENSE.md).
