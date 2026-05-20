@echo off
setlocal
set ROOT=%~dp0..

echo => Assembling public\...
cd /d "%ROOT%"

if not exist public\impactbingo mkdir public\impactbingo
if not exist public\reflectivejournal mkdir public\reflectivejournal
if not exist public\reflectivejournal\facilitator mkdir public\reflectivejournal\facilitator
if not exist public\passport mkdir public\passport

xcopy /E /Y /Q impact-bingo\public\             public\impactbingo\
xcopy /E /Y /Q reflective-journal\public\       public\reflectivejournal\
xcopy /E /Y /Q learning-passport\public\        public\passport\

echo => Building Cloud Functions...
cd /d "%ROOT%\functions"
call npm run build
if errorlevel 1 ( echo Functions build failed. & exit /b 1 )
cd /d "%ROOT%"

echo => Deploying to Firebase (hosting + functions + firestore)...
call firebase deploy --only hosting,functions,firestore
if errorlevel 1 ( echo Deploy failed. & exit /b 1 )

echo.
echo Done! https://game.knywong.com
endlocal
