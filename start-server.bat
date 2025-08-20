@echo off
cd /d "C:\Users\user\Documents\vsc\家計簿アプリ"
echo 家計簿サーバーを起動中...
start "" cmd /k "node server.js"
