module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      all: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js'],
      options: {
        esversion: 6,
        indent: 2,
        eqeqeq: true,
      }
    },
    mocha_istanbul: {
      src: 'test',
      options: {

      }
    },
    coveralls: {
      src: 'coverage/lcov.info'
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-istanbul');
  grunt.loadNpmTasks('grunt-coveralls');

  grunt.registerTask('default', ['jshint','mocha_istanbul']);

};
