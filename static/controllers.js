app.controller('MainController', function ($rootScope,$scope,Goals,UsersApi){

  //History controller will also get new tasks
  $scope.$on('select_task', function(evt,task){
    $scope.$broadcast('event_select_task', task);
  });

  //History controller will also get new tasks
  $scope.$on('select_chart', function(evt,task){
    $scope.$broadcast('event_select_chart', task);
  });
  $scope.goals = [];
  var goalIndex = {};
  $scope.logout = function(){
    UsersApi.logout();
  };
  $scope.getGoals = function(){
      return Goals.get().success(function(){
        $scope.goals = Goals.list;
        var len = $scope.goals.length;
        for(var index = 0; index<len; index++){
          var goal = $scope.goals[index];
          goalIndex[goal.gid] = goal;
        }
      });
    }

  $scope.getGoals();

  $scope.getGoalById = function(gid){
    return goalIndex[gid];
  };

});

app.controller('TimesheetController', 
  function($scope, $rootScope, Goals, TimeSheet){

    $scope.startdate = '';
    $scope.enddate = '';
    $scope.timesheet = [];
    $scope.selected_goals = [];

    $scope.updateTimeSheet = function(){
      TimeSheet.get($scope.startdate, $scope.enddate, $scope.selected_goals)
                .success(function(data){$scope.timesheet = data.timesheet;
                });
    };

    
});
app.controller('TaskController', 
  function ($scope, $rootScope, Tasks, Goals){
    $scope.tasks = [];
    $scope.goals = [];
    $scope.selected = null;
    $scope.editing = null;

    $scope.select = function (task){
      if($scope.selected!==task){
        $scope.editing = null;
        $scope.selected = task;
      }
      $scope.$emit('select_task', task);
    };

    $scope.edit = function (task){
      $scope.editing = task;
    };
    
    function getTasks(){
      Tasks.get().success(function(data) {
        $scope.tasks = data.tasks;
      });
    }

    
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

      $scope.$emit('select_chart', coord[0]);

    };
 });

app.controller('HistoryController', function($scope,History,Goals){

  $scope.timeslots = History.getTimeSlots();
  $scope.getTimeSlot = function getTimeslot(now){
    if(!now && ($scope.selected!=null)) return $scope.selected;
    now = now == null ? new Date() : now;
    for (var i = 0; i < $scope.timeslots.length; i++){
      if ($scope.timeslots[i].time > now){
        return i;
      }
    }
    return -1;

  };
  $scope.selected = $scope.getTimeSlot();

  $scope.select = function (index_1){
    $scope.selected = index_1;
  };

  $scope.getColor = function (timeslot){
    if(timeslot.valence || timeslot.intensity){
      return 'lightblue';
    }
    return 'grey';
  };

  $scope.getTaskColor = function (task) {
    if(!task) return 'grey';
    var goal = $scope.getGoalById(task.goal)
    return goal.color;
  };


 

  $scope.$on('event_select_task', function(evt,task) {
    var ts = $scope.timeslots[$scope.getTimeSlot()];
    ts.task = task;
    var tid = (task && task.tid) || 'RESET';
    History.add(null,null,tid,ts.time.toUTCString());

  });

  $scope.$on('event_select_chart', function(evt,pos) {
    var ts = $scope.timeslots[$scope.getTimeSlot()];
    ts.valence = pos.x;
    ts.intensity = pos.y;
    History.add(ts.valence,ts.intensity,null,ts.time.toUTCString());

  });

  History.getToday().success(function(data){

    $scope.history = data.history;

    $scope.history.map(function(elem){
      var d = new Date(elem.time);
      var ts = $scope.timeslots[$scope.getTimeSlot(d)];
      ts.task = elem.task;
      ts.valence = elem.valence;
      ts.intensity = elem.intensity;

    });
  });


});

app.controller('GoalController', 
  function ($scope, Goals, History){

    $scope.labels =['THING 1','THING 2'];
    $scope.data = [[100,50]];
    $scope.series = ['Hero'];
    $scope.onClick = function(points,evt,d){
      console.log(points,evt,d);
    };
    $scope.selected = null;
    $scope.editing = null;
    var label_index = {};
    $scope.selectRow = function (i){
      if($scope.selected==i){
        $scope.editing = i;
      }
      else{
        $scope.editing = null;
        $scope.selected = i;
      }

    };
    function calcGoals(tlist){
      var total = 0.0;
      var tdat = $scope.labels.map(function (derp){return 0.0;});
      for(var i = 0; i<tlist.length; i++){
        total++;
        tdat[label_index[tlist[i].task.goal]]++;
      }
      return tdat.map(function (elem){return 100.0*elem/total | 0;});

    }
    function getHistory(){
      History.getBreakdown().then(function (data){
        $scope.series.push('This Month'), $scope.data.push(calcGoals(data.month));
        // $scope.series.push('This Week'), $scope.data.push(calcGoals(data.week));
        $scope.series.push('Today'), $scope.data.push(calcGoals(data.day));
      });
    }
    function processGoals(){
      $scope.getGoals().success(function(data){
        Z = data.goals.reduce(function(pv, cv) { return pv + cv.weight; }, 0)/100.0;
        $scope.data = [data.goals.map(function(goal){return goal.weight/Z | 0;})];
        $scope.series = ['Your Target'];
        $scope.labels = data.goals.map(
            function(goal,index){
              label_index[goal.gid] = index;
              return goal.name;
            });

        getHistory();
      });
    }

    $scope.addGoal = function (name,weight){
      Goals.add(name,weight).success(function(){
        $scope.getGoals();
        $scope.goal_name = '';
        $scope.goal_weight = '';
      });
    };
    $scope.editGoal = function(goal){
      Goals.add(goal.name,goal.weight,goal.gid)
            .success($scope.getGoals)
            .then(function (){
              $scope.editing = null;
            });
    };

    processGoals();


  });
