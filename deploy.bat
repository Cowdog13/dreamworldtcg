@echo off
echo Building Dreamworld TCG for deployment...
npx expo export --platform web
echo.
echo Build complete! The 'dist' folder contains your deployable app.
echo.
echo Deployment options:
echo 1. Firebase: firebase deploy --only hosting
echo 2. Netlify: Upload the 'dist' folder to netlify.com
echo 3. Vercel: Upload the 'dist' folder to vercel.com
echo.
echo For Firebase deployment, run: firebase deploy --only hosting
pause