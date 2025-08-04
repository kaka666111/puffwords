@echo off
echo Running migrations...
cd /d D:\game-server\flyway
flyway migrate

echo Running additional SQL scripts...

REM 使用 INSERT IGNORE，防止重复插入报错
mysql -u root -p123life.. game < D:\game-server\insert_data.sql

echo Migration complete!
pause
