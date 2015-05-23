app = angular.module('UserMgmt', ['ui.bootstrap', 'ngCookies']);

app.service('Session', function ($cookieStore,$http,Base64,$rootScope) {
  this.destroy = function () {
    this.token = null;
    $cookieStore.remove('token');
    $cookieStore.remove('user12');
  };

  this.create = function (user) {
    this.token = user.token;
    $rootScope.currentUser = user.user;
    var authdata = Base64.encode(this.token + ':' + 'blah');
    $http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;

    // save 
    $cookieStore.put('token',this.token);
    $cookieStore.put('user12',$rootScope.currentUser);
  };
  
  this.load = function () {
    this.create({'user':$cookieStore.get('user12'),
                'token':$cookieStore.get('token')});
  
    // here is what i need to do -> 
    return $http.post('/api/v1/token');
  };

});

app.service('loginModal', function ($modal, Session) {

  return function() {
    var instance = $modal.open({
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
            transformResponse: appendTransform($http.defaults.transformResponse, 
              function(value) {
                return value;
              })
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

  this.cancel = function(){
    $scope.$dismiss();
  };

  this.submit = function (email, password) {
    UsersApi.login(email, password).then(function (user) {
      $scope.$close(user);
    });
  };

});