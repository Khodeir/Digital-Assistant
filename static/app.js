 // routes.js
var app = angular.module('digitalAssistant', ['ui.router', 'base64', 'UserMgmt', 'ngTouch', 'chart.js']);


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

app.controller('TaskController', 
  function ($scope, $rootScope, Tasks, Goals){
    $scope.user = $rootScope.currentUser;
    $scope.tasks = [];
    $scope.goals = [];
    $scope.selected = null;
    $scope.editing = null;


    $scope.select = function (task){
      if($scope.selected===task){
        $scope.editing = task;
      }
      else{
        $scope.editing = null;
        $scope.selected = task;
      }
    }
    
    function getTasks(){
      Tasks.get().success(function(data) {
        $scope.tasks = data.tasks;
      });
    }

    function getGoals(){
      Goals.get().success(function(data){
        $scope.goals = data.goals;
      });
    }

    
    $scope.getColor = Goals.getColor;

    $scope.addTask = function (t,g){
      Tasks.add(t,g).success(function(){
        getTasks();
        $scope.task_name = '';
        $scope.goal_name = '';
      });
    };
    $scope.editTask = function(task){
      Tasks.add(task.name,task.goal,task.done,task.tid)
            .success(getTasks)
            .then(function (){
              $scope.editing = null;
            });
    };

    getGoals();
    getTasks();

  });
 app.controller('ChartController', function($scope){
      $scope.chart = null;
    $scope.chartjs = null;
    $scope.$on('create',function(evt,chart,chartjs){
    $scope.chart = chart;
    $scope.chartjs=chartjs;
    });

    // chart
    $scope.options = {showAnimation: false,tooltipTemplate: "<%=datasetLabel%>", tooltipFillColor:'rgba(0,0,0,0)',tooltipFontColor:'rgba(0,0,0,1)'};
    var initial = $scope.data = [
    {
      label:'Neutral',
      pointColor: 'silver',
      data: [
        { ease: 1, x: 0, y: 0 }, 

      ]
    },
    {
      label:'Happy',
      pointColor: 'green',
      data: [
        { ease: 1, x: 10, y: 0 }, 

      ]
    },
    {
      label:'Unhappy',
      pointColor: 'red',
      data: [
        { ease: 1, x: -10, y: 0 }, 

      ]
    },
    {
      label:'Intense',
      pointColor: 'orange',
      data: [
        { ease: 1, x: 0, y: 10 }, 

      ]
    },
    {
      label:'Mild',
      pointColor: 'purple',
      data: [
        { ease: 1, x: 0, y: -10 }, 

      ]
    },
    {
      label:'Depressed',
      pointColor: 'black',
      data: [
        { ease: 1, x: -10, y: -10 }, 

      ]
    },
    {
      label:'Enraged',
      pointColor: 'darkred',
      data: [
        { ease: 1, x: -10, y: 10 }, 

      ]
    },
    {
      label:'Ecstatic',
      pointColor: 'darkgreen',
      data: [
        { ease: 1, x: 10, y: 10 }, 

      ]
    },
    {
      label:'Lazy',
      pointColor: 'lightgreen',
      data: [
        { ease: 1, x: 10, y: -10 }, 

      ]
    }
    
  ];
  function updateLabels(){
    $scope.labels = $scope.data.map(function(e){return e.label;});
  }
  updateLabels();
      $scope.onClick = function(points,evt){ 
      var pos = $scope.chartjs.helpers.getRelativePosition(evt);
      // chartjs.ScatterNum 
      var coord = [$scope.chart.scale.convert(pos,$scope.chart.scale.currentEase)];

      $scope.data = initial.concat([{
          label:'You',
          pointColor: 'black',
          data: coord,
        }]);
      updateLabels();

    };
 });

app.controller('HistoryController', function($scope){
  $scope.timeslots = [{start:'00:00',task:''},{start:'01:00',task:''},{start:'02:00',task:''},{start:'03:00',task:''},{start:'04:00',task:''},{start:'05:00',task:''},{start:'06:00',task:''},{start:'07:00',task:''},{start:'08:00',task:''},{start:'09:00',task:''},{start:'10:00',task:''},{start:'11:00',task:''},{start:'12:00',task:''},{start:'13:00',task:''},{start:'14:00',task:''},{start:'15:00',task:''},{start:'16:00',task:''},{start:'17:00',task:''},{start:'18:00',task:''},{start:'19:00',task:''},{start:'20:00',task:''},{start:'21:00',task:''},{start:'22:00',task:''},{start:'23:00',task:''}];
  $scope.today = 'Thursday'

});

app.controller('GoalController', 
  function ($scope, Goals){

    $scope.labels =['THING 1','THING 2'];
    $scope.data = [[100,50]];
    $scope.onClick = function(points,evt,d){
      console.log(points,evt,d);
    };
    $scope.goals = [];
    $scope.selected = null;
    $scope.editing = null;

    $scope.selectRow = function (i){
      if($scope.selected==i){
        $scope.editing = i;
      }
      else{
        $scope.editing = null;
        $scope.selected = i;
      }

    };
    
    function getGoals(){
      Goals.get().success(function(data){
        $scope.goals = data.goals;

        Z = data.goals.reduce(function(pv, cv) { return pv + cv.weight; }, 0)/100.0;
        $scope.data = [data.goals.map(function(goal){return goal.weight/Z;})];
        $scope.labels = data.goals.map(function(goal){return goal.name;});
      });
    }

    $scope.addGoal = function (name,weight){
      Goals.add(name,weight).success(function(){
        getGoals();
        $scope.goal_name = '';
        $scope.goal_weight = '';
      });
    };
    $scope.editGoal = function(goal){
      Goals.add(goal.name,goal.weight,goal.gid)
            .success(getGoals)
            .then(function (){
              $scope.editing = null;
            });
    };

    getGoals();

    
    $scope.getColor = Goals.getColor;

  });
app.service('Tasks',function ($http) {
    this.get = function (){
      return $http.get('/api/v1/tasks');
      
    }
    this.add = function (name,goal,done,tid) {
      return $http.post('/api/v1/tasks',{'name':name, 'goal':goal,'done':done,'tid':tid});
    };
        
  });
app.factory('Goals',function ($http) {
  model = {};
    model.goal_index = [];
    model.get = function (){
      return $http.get('/api/v1/goals').success(function(data){
        model.goal_index = data.goals.map(function(element){
          return element.name; });
      });
      
    };

    model.add = function (name,weight,gid) {
      return $http.post('/api/v1/goals',{'name':name, 'weight':weight,'gid':gid});
    };

    model.getColor = function (goalname){
      var colors = ['A200BF','00757F','FFCC00','0001CF', '00E526', 
                      'BF7200', '7F0072', 'FFDC00', 'CF0007']
      var i = model.goal_index.indexOf(goalname);
  
      if(i == -1)
        return 'grey';
      return colors[i%colors.length];
    }

    return model;
        
  });

// app.js


app.config(function ($stateProvider, $urlRouterProvider, 
                        $httpProvider, $interpolateProvider) {

    $urlRouterProvider.otherwise('/');

  $stateProvider
    .state('welcome', {
      url: '/',
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
        if (rejection.status !== 403 || !rejection.config.handleError) {
          return $q.reject(rejection);
        }

        var deferred = $q.defer();

        loginModal()
          .then(function () {
            deferred.resolve( $http(rejection.config) );
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


