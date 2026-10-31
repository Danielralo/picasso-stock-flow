@echo off
chcp 65001 >nul
setlocal EnableExtensions
rem =====================================================================
rem  Instala el sistema en XAMPP sin necesidad de Node.js.
rem  Copia las pantallas ya compiladas (pantallas-compiladas) y la API en
rem  PHP (servidor) a la carpeta htdocs\picasso de XAMPP.
rem  Después: enciende Apache y MySQL y abre http://localhost/picasso
rem =====================================================================
cd /d "%~dp0"
echo.
echo === Picasso Autosport: instalar en XAMPP ===
echo.

rem 1) Buscar la carpeta htdocs de XAMPP
set "HTDOCS="
if exist "C:\xampp\htdocs\" set "HTDOCS=C:\xampp\htdocs"
if not defined HTDOCS if exist "D:\xampp\htdocs\" set "HTDOCS=D:\xampp\htdocs"
if not defined HTDOCS (
  echo No encontre XAMPP en C:\xampp ni en D:\xampp.
  set /p "HTDOCS=Escribe la ruta de la carpeta htdocs de tu XAMPP, por ejemplo E:\xampp\htdocs: "
)
if not exist "%HTDOCS%\" (
  echo La carpeta "%HTDOCS%" no existe. Instala XAMPP y vuelve a intentarlo.
  goto fallo
)
set "DESTINO=%HTDOCS%\picasso"
echo Se instalara en: %DESTINO%
echo.

rem 2) Copiar las pantallas (index.html, favicon y la carpeta assets)
echo [1/2] Copiando las pantallas...
robocopy "pantallas-compiladas\assets" "%DESTINO%\assets" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto fallo
robocopy "pantallas-compiladas" "%DESTINO%" /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto fallo

rem 3) Copiar la API en PHP y el script de la base de datos
echo [2/2] Copiando la API (PHP) y el script de la base de datos...
robocopy "servidor" "%DESTINO%" /E /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto fallo

echo.
echo Listo. Ahora:
echo   1. Abre el XAMPP Control Panel y presiona Start en Apache y en MySQL.
echo   2. Entra a http://localhost/picasso
echo      La primera vez el sistema crea solo la base de datos picasso_inventario.
echo.
rem Si Apache ya esta encendido, se abre el navegador
tasklist /FI "IMAGENAME eq httpd.exe" 2>nul | find /I "httpd.exe" >nul
if not errorlevel 1 start "" "http://localhost/picasso"
pause
exit /b 0

:fallo
echo.
echo Hubo un error. Revisa los mensajes de arriba.
pause
exit /b 1
