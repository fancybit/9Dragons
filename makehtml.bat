@echo off
REM Convert md files to html
REM Call node.js script

cd /d "%~dp0"
echo Starting to convert markdown files to html...
node md-to-html.js
echo Conversion completed! Press any key to exit...
pause > nul
