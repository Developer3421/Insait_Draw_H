@echo off
echo Adding firewall rule for Insait Draw H...

REM Видаляємо старі правила якщо існують
netsh advfirewall firewall delete rule name="Insait Draw H" >nul 2>&1

REM Додаємо правило для вхідних TCP з'єднань на порти 8765-9000
netsh advfirewall firewall add rule name="Insait Draw H" dir=in action=allow protocol=tcp localport=8765-9000 profile=private,domain,public

REM Додаємо правило для localhost (loopback)
netsh advfirewall firewall add rule name="Insait Draw H Loopback" dir=in action=allow protocol=tcp localport=8765-9000 remoteip=127.0.0.1 profile=any

echo.
echo Done! Firewall rules have been configured.
echo.
pause
