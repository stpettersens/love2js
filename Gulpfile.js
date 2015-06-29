/*
  Build operations for love2js.
*/
var gulp = require('gulp'),
      fs = require('fs'),
     tsc = require('gulp-typescript'),
 replace = require('gulp-replace');

gulp.task('default', function() {
  return gulp.src('*.ts')
  .pipe(tsc({
    module: 'commonjs'
  }))
  .pipe(replace(/\/{3}\s*<reference path=.*\/>\r*\n*/g, ''))
  .pipe(gulp.dest('.'));
});

gulp.task('clean', function() {
  fs.unlinkSync('love2js-cli.js');
  fs.unlinkSync('love2js.js');
  fs.unlinkSync('LuaASTParser.js');
});
