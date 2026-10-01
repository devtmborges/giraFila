@echo off
title Servidor PHP - GiraFila
color 0A

echo ========================================================
echo Iniciando o servidor de aplicacao PHP para o GiraFila...
echo ========================================================

cd /d C:\Users\User\Herd\GiraFila
if %errorlevel% neq 0 (
echo [ERRO] A pasta C:\Users\User\Herd\GiraFila nao foi encontrada!
pause
exit
)

echo Pasta de trabalho: C:\GiraFila
echo Servidor rodando em: http://localhost:8080
echo Pressione CTRL+C para encerrar o servidor a qualquer momento.
echo --------------------------------------------------------

php -S 0.0.0.0:8080

pause