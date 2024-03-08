file=$1

if [ -n "$file" ]
then
  npx jest --no-cache --watch -- __test__/compiler/$file.test.ts
else
  echo "please specific a test name"
fi

