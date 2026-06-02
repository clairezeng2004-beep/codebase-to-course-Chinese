#!/bin/bash
# Assembles the course from parts.
# Run from the course directory: bash build.sh
set -e
course_name="$(basename "$PWD")"
output_file="${course_name}.html"
rm -f index.html
cat _base.html modules/*.html _footer.html > "$output_file"
echo "Built $output_file — open it in your browser."
