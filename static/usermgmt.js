app = angular.module('UserMgmt', ['ui.bootstrap', 'ngCookies']);

app.factory('Session', function ($cookieStore,$http,Base64,$rootScope) {
  var object = {};
  object.destroy = function () {
    object.token = null;
    $cookieStore.remove('token');
    $cookieStore.remove('user12');
  };
  object.save = function () {
    $cookieStore.put('token',object.token);
    $cookieStore.put('user12',$rootScope.currentUser);
  };

  object.create = function (user) {
    object.token = user.token;
    $rootScope.currentUser = user.user;
    var authdata = Base64.encode(object.token + ':' + 'blah');
    $http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;

    return $http.post('/api/v1/token').success(function (data) {
                        if(data.valid) {
                          object.save();
                        }
                      });
  };


  object.load = function () {
    var user = $cookieStore.get('user');
    var token = $cookieStore.get('token');
    return object.create({'user':user,
                'token':token});
  };

  return object;

});

app.service('loginModal', function ($modal, Session) {

 
  return function() {
     var instance  = $modal.open({
      templateUrl: '/static/LoginModal.html',
      controller: 'LoginModalCtrl',
      controllerAs: 'LoginModalCtrl'
    });
    return instance.result.then(Session.create);
  };

});
app.factory('UsersApi', function ($http, $q, Base64, Session) {
  var authService = {};
 
  authService.login = function (user, password) {
  var authdata = Base64.encode(user + ':' + password);
  var deferred = $q.defer();
  function appendTransform(defaults, transform) {

    // We can't guarantee that the default transformation is an array
    defaults = angular.isArray(defaults) ? defaults : [defaults];

    // Append the new transformation to the defaults
    return defaults.concat(transform);
  }

  $http({
            url:'/api/v1/token',
            method: 'GET',
            headers: {'Authorization': 'Basic ' + authdata},
            handleError: false,
            transformResponse: appendTransform($http.defaults.transformResponse, 
              function(value) {
                return value;
              })
          }).error(function (data, status, headers, config) {
            deferred.reject(data);
          }).success(function (data) {
            deferred.resolve(data);
          });
  return deferred.promise;
  };

  authService.isAuthenticated = function () {
    return !!Session.token;
  };
 
  authService.isAuthorized = function () {
    return authService.isAuthenticated();
  };
 
  return authService;
});


// LoginModalCtrl.js

app.controller('LoginModalCtrl', function ($scope, UsersApi) {
  $scope.message = '';
  this.cancel = function(){
    $scope.$dismiss();
  };

  this.submit = function (email, password) {
    UsersApi.login(email, password).then(function (user) {
      $scope.$close(user);
    },function (data){
      $scope.message = data;
    });
  };

});