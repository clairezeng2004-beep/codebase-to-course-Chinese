#!/bin/bash
# Assembles the course from parts.
# Run from the course directory: bash build.sh
set -e
course_name="$(basename "$PWD")"
output_file="${course_name}.html"
cat _base.html modules/*.html _footer.html > "$output_file"
cp "$output_file" index.html
echo "Built $output_file and index.html — open either in your browser."
