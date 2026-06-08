#!/usr/bin/env bash
# Regenerate Python and TypeScript types from the schema.
#
# FOLLOW-UP REQUIRED. The CA Foundation QA Profile composes the exam-agnostic
# Core via $ref by $id (https://pinaka.dev/schema/uqs-core-1.json). The codegen
# tools below cannot resolve that cross-file $ref as-is. A bundling step that
# inlines the Core into a single self-contained document must run first. Until
# that exists, this script is a guarded placeholder so it does not emit wrong types.
set -euo pipefail
cd "$(dirname "$0")"

CORE="core/uqs-core.schema.json"
PROFILE="profiles/ca-foundation-qa/ca-foundation-qa.schema.json"

echo "Codegen is not wired yet for the Core/Profile \$ref composition."
echo "Inputs that must be bundled into one document first:"
echo "  - $CORE"
echo "  - $PROFILE"
echo "See schema/README.md, section 'Codegen follow-up'."
exit 1
