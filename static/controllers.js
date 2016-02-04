app.controller('MainController', function ($rootScope,$scope,Goals,UsersApi){

  //History controller will also get new tasks
  $scope.$on('select_task', function(evt,task){
    $scope.$broadcast('event_select_task', task);
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

        $scope.$broadcast('goals_retrieved');
      });
    }

  $scope.getGoals();

  $scope.getGoalById = function(gid){
    return goalIndex[gid];
  };

});

app.controller('TimesheetController', 
  function($scope, $rootScope, TimeSheet){

    $scope.startdate = '';
    $scope.enddate = '';
    $scope.timesheet = [];
    $scope.selected_goals = [];
    $scope.datepicker_start_isopen = false;
    $scope.datepicker_end_isopen = false;

    $scope.updateTimeSheet = function(){
      TimeSheet.get($scope.startdate, 
                    $scope.enddate, 
                    $scope.selected_goals)
                .success(function(data){
                  $scope.timesheet = data.timesheet;
                });
    };

    
});
app.controller('TaskController', 
  function ($scope, $rootScope, Tasks, Goals){
    $scope.tasks = [];
    $scope.selected = null;
    $scope.editing = null;
    $scope.new_task = {};

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
        $scope.tasks = [];
        for(var i = 0; i < data.tasks.length; i++){
          var task = data.tasks[i];
          task.goal = $scope.getGoalById(task.goal);
          $scope.tasks.push(task);
        }
      });
    }

    
    $scope.addTask = function (new_task){

      Tasks.add(new_task).success(function(){
        getTasks();
        $scope.new_task = {};
      });
    };
    $scope.editTask = function(task){
      Tasks.add(task)
            .success(getTasks)
            .then(function (){
              $scope.editing = null;
            });
    };
    $scope.deleteTask = function(task){
      if(confirm('Really delete ' + task.name + '?'))
      Tasks.delete(task)
            .success(getTasks)
            .then(function (){
              $scope.editing = null;
            });
    };
    $scope.$on('goals_retrieved', getTasks);

    // if the maincontroller is already loaded
    if($scope.goals){
      getTasks();
    }

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

  $scope.getEmotionColor = function (timeslot){
    return 'grey';
  };

  $scope.getTaskColor = function (timeslot) {
    if(!timeslot.task) return 'grey';
    return timeslot.task.goal.color;
  };
  $scope.addHistory = function (task, ts) {
    if(ts == null){
      ts = $scope.timeslots[$scope.getTimeSlot()];
    }
    ts.task = task;
    History.add(ts);
  };
  $scope.$on('event_select_task', function(evt,task) {
    $scope.addHistory(task);
  });


  $scope.$on('goals_retrieved', function() {
    History.getToday().success(function(data){

      $scope.history = data.history;

      $scope.history.map(function(elem){
        var d = new Date(elem.time);
        // timeslots are assigned at the beginning
        var ts = $scope.timeslots[$scope.getTimeSlot(d)];
        // needs goals to be loaded
        ts.task = elem.task;
        ts.task.goal = $scope.getGoalById(elem.task.goal);
        ts.valence = elem.valence;
        ts.intensity = elem.intensity;

      });
    });
  });




});

app.controller('GoalController', 
  function ($scope, Goals, History){

    $scope.labels =['THING 1','THING 2'];
    $scope.data = [[100,50]];
    $scope.series = ['Hero'];
    $scope.new_goal = {};
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

    $scope.addGoal = function (goal){

      Goals.add(goal).success(function(){
        processGoals();
        $scope.new_goal = {};
      });
    };
    $scope.editGoal = function(goal){
      Goals.add(goal)
            .success(processGoals)
            .then(function (){
              $scope.editing = null;
            });
    };

    processGoals();


  });
