/*
  Build operations for love2js.
*/
var gulp = require('gulp'),
      fs = require('fs'),
     tsc = require('gulp-typescript'),
  insert = require('gulp-insert');

gulp.task('default', function() {
  return gulp.src('*.ts')
  .pipe(tsc({
    removeComments: true,
    module: 'commonjs'
  }))
  .pipe(gulp.dest('.'));
});

gulp.task('clean', function() {
  fs.unlinkSync('love2js-cli.js');
  fs.unlinkSync('love2js.js');
  fs.unlinkSync('LuaASTParser.js');
});
