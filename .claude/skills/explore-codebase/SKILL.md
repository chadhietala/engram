---
name: explore-codebase
description: Systematically locate and understand how specific functionality is implemented across a codebase
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T14:27:23.066Z
  sourcePatternId: ca9a7667-8d0a-4d52-ac4f-99436220c3d3
  sourceSynthesisId: 86f883ac-6655-4af1-9996-9562e3306936
---

# Explore Codebase

## Overview

When you need to understand how a feature works or find where specific functionality lives in an unfamiliar codebase, start with broad searches to discover relevant files, then narrow your focus to examine implementation details. This two-phase approach prevents information overload while ensuring you find all related code. Begin with keyword searches and file patterns, then once you've identified the key files, dive deeper with targeted queries to understand the specific implementation.

## When to Use

- You need to understand how an existing feature is implemented
- You're looking for where specific functionality or APIs are defined
- You want to modify code but first need to locate all related files
- You're debugging an issue and need to trace through the implementation
- You're onboarding to a new codebase and need to understand architecture patterns

## Steps

1. **Cast a wide net with keyword searches**
   Search for function names, class names, or feature-related keywords across the entire codebase to identify potentially relevant files. Use broad patterns like searching for 'authentication' or 'payment' to discover all related code.

2. **Search by file patterns and structure**
   Use glob patterns to find files by naming conventions (like *Auth*.ts or **/*Service.java) and examine exports or public APIs to understand what each module provides.

3. **Identify primary implementation files**
   Review search results to determine which files contain the core implementation versus peripheral code. Look for main classes, entry points, or files with the most relevant matches.

4. **Examine specific implementation details**
   Once you've located the key files, perform targeted searches for specific types, methods, or patterns within those files. Read relevant sections to understand data structures, algorithms, and dependencies.

5. **Trace connections and dependencies**
   Follow imports, function calls, and type references to understand how components interact. Use precise file paths and line-limited reads to focus on the most relevant code sections.
