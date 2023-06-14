npm run build

source=/Users/zhouyunge/Documents/tarat/packages/server/dist/cli
target=//Users/zhouyunge/Documents/fishpond-desktop/node_modules/tarat/cli

source2=/Users/zhouyunge/Documents/tarat/packages/server/dist
target2=//Users/zhouyunge/Documents/fishpond-desktop/node_modules/tarat

cliFiles=`ls $source`
cliFiles2=`ls $source2`

for f in $cliFiles; do
  echo $source/$f
  cp $source/$f $target/$f
done

for f in $cliFiles2; do
  echo $source2/$f
  if [ ! -d "$source2/$f" ]; then
    cp $source2/$f $target2/$f
  fi
done