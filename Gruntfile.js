module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      all: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js'],
      options: {
        indent: 2,
        eqeqeq: true
      }
    },
    mocha_istanbul: {
      src: 'test',
      options: {

      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-istanbul');


  grunt.registerTask('default', ['jshint','mocha_istanbul']);


};
