(function(){
  'use strict';

  define([
      'app',
      'utils/chartHelpers',
      'utils/duration',
      'utils/escapeHtml',
      'directives/radialProgressBar',
      'directives/timeSince',
      'directives/duration',
      'filters/escape',
      'filters/wordwrap',
      'modules/collection',
      'modules/flash',
      'modules/pagination'], function(app, chartHelpers, duration, escapeHtml) {
    app.controller('buildDetailsCtrl', [
        '$scope', '$rootScope', 'initialData', '$window', '$timeout', '$http', '$routeParams', '$filter', 'stream', 'flash', 'collection',
        function($scope, $rootScope, initialData, $window, $timeout, $http, $routeParams, $filter, Stream, flash, Collection) {

      // TODO(dcramer): find a better way to render partials/something where we can keep the
      // build header, but change the body based on the number of jobs
      if (initialData.data.jobs.length == 1) {
        $window.location.href = initialData.data.jobs[0].link;
        return;
      }

      var stream,
          entrypoint = '/api/0/builds/' + $routeParams.build_id + '/',
          chart_options = {
            tooltipFormatter: function(item) {
              var content = '';

              content += '<h5>';
              content += escapeHtml(item.name);
              content += '<br><small>';
              content += escapeHtml(item.target);
              if (item.author) {
                content += ' &mdash; ' + item.author.name;
              }
              content += '</small>';
              content += '</h5>';
              if (item.status.id == 'finished') {
                content += '<p>Build ' + item.result.name;
                if (item.duration) {
                  content += ' in ' + duration(item.duration);
                }
                content += '</p>';
              } else {
                content += '<p>' + item.status.name + '</p>';
              }

              return content;
            }
          };

      function getFormattedBuildMessage(message) {
        return $filter('linkify')($filter('escape')(message));
      }

      function getPageTitle(build) {
        if (build.number) {
          return 'Build #' + build.number + ' - ' + $scope.project.name;
        }
        return 'Build ' + build.id + ' - ' + $scope.project.name;
      }

      function updateBuild(data){
        $scope.$apply(function() {
          $scope.build = data;
        });
      }

      $scope.retryBuild = function() {
        $http.post('/api/0/builds/' + $scope.build.id + '/retry/')
          .success(function(data){
            $window.location.href = data.build.link;
          })
          .error(function(){
            flash('error', 'There was an error while retrying this build.');
          });
      };

      $scope.getBuildStatus = function(build) {
        if (build.status.id == 'finished') {
          return build.result.name;
        } else {
          return build.status.name;
        }
      };

      $scope.$watch("build.message", function(value) {
        if (value) {
          $scope.formattedBuildMessage = getFormattedBuildMessage(value);
        } else {
          $scope.formattedBuildMessage = null;
        }
      });

      $scope.project = initialData.data.project;
      $scope.build = initialData.data.build;
      $scope.jobs = new Collection($scope, initialData.data.jobs);
      $scope.previousRuns = initialData.data.previousRuns;
      $scope.chartData = chartHelpers.getChartData($scope.previousRuns, $scope.build, chart_options);
      $scope.testFailures = initialData.data.testFailures;
      $scope.seenBy = initialData.data.seenBy.slice(0, 14);

      $rootScope.activeProject = $scope.project;
      $rootScope.pageTitle = getPageTitle($scope.build);

      stream = new Stream($scope, entrypoint);
      stream.subscribe('build.update', updateBuild);
      stream.subscribe('job.update', function(data) { $scope.jobs.updateItem(data); });

      if ($scope.build.status.id == 'finished') {
        $http.post('/api/0/builds/' + $scope.build.id + '/mark_seen/');
      }

    }]);
  });
})();
