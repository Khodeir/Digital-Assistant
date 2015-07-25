 // routes.js
var app = angular.module('digitalAssistant', ['ui.router', 'base64', 'UserMgmt', 'ngTouch', 'chart.js', 'angular.filter']);


app.run(function ($rootScope, $state, loginModal, Session) {

  $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
    var requireLogin = toState.data.requireLogin;

    if (requireLogin && typeof $rootScope.currentUser === 'undefined') {
      event.preventDefault();
      Session.load().success(function (data){
        if (data.valid != true){
          loginModal()
            .then(function () {
              return $state.go(toState.name, toParams);
            })
            .catch(function () {
              return $state.go('welcome');
            });



          }
          else{
            return $state.go(toState.name, toParams);
          }

        });
        
      }
  });
});


// app.js


app.config(function ($stateProvider, $urlRouterProvider, 
                        $httpProvider, $interpolateProvider) {

  $urlRouterProvider.otherwise('/');

  $stateProvider
    .state('welcome', {
      url: '/',
      template: '<button class="btn-primary" ui-sref="app.tasks">Login</button>',
      // abstract: true,
      // templateUrl: '/static/derp.html',
      // controller: 'LoginModalCtrl',
      data: {
        requireLogin: false
      }
    })
    .state('app',{

      abstract: true,
      templateUrl: "/static/app.html",
      controller: 'MainController',
      data: {
        requireLogin: true // this property will apply to all children of 'app'
      }
    })
    .state('app.tasks', {
      abstract: false,
      url: '/tasks',
      templateUrl: '/static/TaskList.html',
      controller: 'TaskController',
 
    })
    .state('app.goals', {
      // child state of `app`
      // requireLogin === true
      url: '/goals',
      templateUrl: '/static/GoalList.html',
      controller: 'GoalController',
    })
    .state('app.timesheet', {
      // child state of `app`
      // requireLogin === true
      url: '/timesheet',
      templateUrl: '/static/Timesheet.html',
      controller: 'TimesheetController',
    });

    $httpProvider.interceptors.push(function ($timeout, $q, $injector) {
    var loginModal, $http, $state;

    // this trick must be done so that we don't receive
    // `Uncaught Error: [$injector:cdep] Circular dependency found`
    $timeout(function () {
      loginModal = $injector.get('loginModal');
      $http = $injector.get('$http');
      $state = $injector.get('$state');
    });

    return {
      responseError: function (rejection) {
        if (rejection.status !== 403 || rejection.config.handleError==false) {
          return $q.reject(rejection);
        }

        var deferred = $q.defer();

        loginModal()
          .then(function () {
            delete rejection.config.headers.Authorization;
            deferred.resolve(  $http(rejection.config) );
          })
          .catch(function () {
            $state.go('welcome');
            deferred.reject(rejection);
          });

        return deferred.promise;
      }
    };
  });
  $interpolateProvider.startSymbol('{[{').endSymbol('}]}');

});


