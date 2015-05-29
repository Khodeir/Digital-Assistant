app.controller('MainController', function ($scope){

  //History controller will also get new tasks
  $scope.$on('select_task', function(evt,task){
    $scope.$broadcast('event_select_task', task);
  });

  //History controller will also get new tasks
  $scope.$on('select_chart', function(evt,task){
    $scope.$broadcast('event_select_chart', task);
  });
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

      $scope.$emit('select_chart', coord[0]);

    };
 });

app.controller('HistoryController', function($scope,History,Goals){

  $scope.timeslots = History.getTimeSlots();
  $scope.getTimeSlot = function getTimeslot(now){
    if(!now && $scope.selected) return $scope.selected;
    var now = now || new Date;
    for (var i = 0; i < $scope.timeslots.length; i++){
      if ($scope.timeslots[i].time > now){
        return i-1;
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
    return Goals.getColor(task.goal);
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
