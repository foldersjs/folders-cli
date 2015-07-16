var gulp = require('gulp');
var esformatter = require('gulp-esformatter');
var eslint = require('gulp-eslint');

gulp.task('default', function() {
  // place code for your default task here
});


//Beautify JavaScript code with esformatter 
gulp.task('esformatter', function () {
    return gulp.src('./src/*.js')
        .pipe(esformatter({indent: {value: '  '}}))
        .pipe(gulp.dest('dist'));
});

//Js Code linting
gulp.task('lint', function () {
    return gulp.src('./src/*.js')
        // eslint() attaches the lint output to the eslint property 
        // of the file object so it can be used by other modules. 
        .pipe(eslint())
        // eslint.format() outputs the lint results to the console. 
        // Alternatively use eslint.formatEach() (see Docs). 
        .pipe(eslint.format())
        // To have the process exit with an error code (1) on 
        // lint error, return the stream and pipe to failOnError last. 
        .pipe(eslint.failOnError());
});
 