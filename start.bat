@echo off
echo ========================================
echo   Application de Gestion des Commandes
echo ========================================
echo.

echo Installation des dependances...
call npm run install-all

echo.
echo Configuration de l'environnement...
if not exist "server\.env" (
    echo Fichier .env manquant dans le dossier server/
    echo Veuillez configurer le fichier .env selon le README.md
    pause
    exit /b 1
)

echo.
echo Demarrage de l'application...
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Appuyez sur Ctrl+C pour arreter l'application
echo.

call npm run dev
