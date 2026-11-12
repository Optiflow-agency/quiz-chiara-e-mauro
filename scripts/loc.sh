#!/usr/bin/env bash
# Gross line counts (blank lines and comments included) of git-tracked files, by category.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

category() {
	case "$1" in
		package-lock.json | static/* | *.svg | *.png | *.ico | *.woff2) echo skip ;;
		*.md | .impeccable/*) echo Docs ;;
		src/lib/content/*) echo Content ;;
		*.spec.ts) echo Tests ;;
		src/*) echo "App code" ;;
		supabase/*) echo Database ;;
		*) echo "Config & tooling" ;;
	esac
}

git ls-files -z | while IFS= read -r -d '' file; do
	[ -f "$file" ] || continue
	kind=$(category "$file")
	[ "$kind" = skip ] && continue
	printf '%s\t%s\n' "$kind" "$(wc -l <"$file" | tr -d ' ')"
done | awk -F'\t' '
	{ files[$1]++; lines[$1] += $2; totalFiles++; totalLines += $2 }
	END {
		printf "%-18s %6s %8s\n", "Category", "Files", "Lines"
		for (kind in lines) printf "%-18s %6d %8d\n", kind, files[kind], lines[kind] | "sort"
		close("sort")
		printf "%-18s %6d %8d\n", "Total (gross)", totalFiles, totalLines
	}'
