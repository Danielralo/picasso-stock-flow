@echo off
chcp 65001 >nul
setlocal EnableExtensions
rem =====================================================================
rem  Úsalo cuando cambies el código de las pantallas (carpeta src).
rem  Necesita Node.js. Vuelve a generar pantallas-compiladas con
rem  npm run build:xampp y luego instala todo en XAMPP.
rem =====================================================================
cd /d "%~dp0"
echo.
echo === Picasso Autosport: compilar y publicar en XAMPP ===
echo.
where npm >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Instalalo desde https://nodejs.org y vuelve a intentarlo.
  echo Si solo quieres probar el sistema, usa instalar-en-xampp.bat
  goto fallo
)
if not exist "node_modules\" (
  echo Instalando las dependencias por primera vez con npm install...
  call npm install
  if errorlevel 1 goto fallo
)
echo Generando las pantallas (npm run build:xampp)...
call npm run build:xampp
if errorlevel 1 goto fallo

call "%~dp0instalar-en-xampp.bat"
exit /b %errorlevel%

:fallo
echo.
echo Hubo un error. Revisa los mensajes de arriba.
pause
exit /b 1
