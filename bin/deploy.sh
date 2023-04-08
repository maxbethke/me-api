
npm run build
cp package.json ./dist/package.json
cd ./dist || exit
npm install --omit=dev
zip -FSr9 dist.zip . -x dist.zip
aws lambda update-function-code \
    --function-name me-api \
    --zip-file fileb://dist.zip
