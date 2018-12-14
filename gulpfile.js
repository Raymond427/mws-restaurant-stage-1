const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
const imageResize = require('gulp-image-resize');
 
gulp.task('default', () =>
    gulp.src('C:/Users/rferr/Documents/Udacity/Mobile Web Specialist/mws-restaurant-stage-1/img*')
        .pipe(imagemin())
            .pipe(gulp.dest('C:/Users/rferr/Documents/Udacity/Mobile Web Specialist/mws-restaurant-stage-1/img/'))
);

gulp.task('resize', function () {
    return new Promise(
        (resolve, reject) => 
            resolve(
                gulp.src('C:/Users/rferr/Documents/Udacity/Mobile Web Specialist/mws-restaurant-stage-1/img*')
                    .pipe(imageResize({ height : 550 }))
                        .pipe(gulp.dest('C:/Users/rferr/Documents/Udacity/Mobile Web Specialist/mws-restaurant-stage-1/img/'))
        )
    );
});