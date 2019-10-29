curl https://raw.githubusercontent.com/Dibasic/userscript-minify/master/minify.pl > minify.pl
./minify.pl script.js > script.min.js
git add script.min.js
git commit -m "Automatic minification by travis-ci"
git push origin dev-travis