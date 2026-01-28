npm install

if [ "$DEBUG_NEXT" = "false" ]; then
    npm run build
    npm run start
else
    npm run dev
fi