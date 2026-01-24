#!/bin/bash
failed=0
for i in $(seq 1 50); do
  if npm run test:vitest -- file-operation.test.ts -t "updating file" > /dev/null 2>&1; then
    echo "Attempt #$i: passed"
  else
    echo -e "\033[31mAttempt #$i: failed\033[0m"
    failed=1
  fi
done
if [ "$failed" -eq 1 ]; then
  exit 1
fi
