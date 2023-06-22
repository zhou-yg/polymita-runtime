file=$1

if [ -n "$file" ]
then
  npx jest --runInBand --watch -- __test__/signal-model/$file.test.ts
else
  echo "please specific a test name"
fi

