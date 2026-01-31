@echo off
echo Adding firewall rule for Insait Draw H...
netsh advfirewall firewall add rule name="Insait Draw H" dir=in action=allow protocol=tcp localport=8765-9000
echo.
echo Done! Now devices on your network can connect to the app.
echo.
pause
