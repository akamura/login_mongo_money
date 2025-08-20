@echo off
cd /d %~dp0
echo 家計簿アプリのサーバーを起動中...

:: ポート8001を開放（重複エラー無視）
netsh advfirewall firewall add rule name="NodeApp8001" dir=in action=allow protocol=TCP localport=8001 > nul 2>&1

:: サーバー起動
start node server.js

:: 自動でブラウザで表示
timeout /t 2 > nul
start http://localhost:8001/index.html

exit
