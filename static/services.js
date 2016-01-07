app.service('Tasks',function ($http) {
    this.get = function (){
      return $http.get('/api/v1/tasks');
      
    }
    this.add = function (task) {
      return $http.post('/api/v1/tasks',{'name':task.name, 
                                         'goal':task.goal.gid,
                                         'done':task.done,
                                         'tid':task.tid});
    };
    this.delete = function (task) {
      return $http.delete('api/v1/tasks', {'data':{'tid':task.tid}});
    };
        
});
app.service('TimeSheet',function ($http) {
    this.get = function (startdate, enddate, goals){
      return $http.post('/api/v1/timesheet', 
                    {'startdate':startdate ? startdate.toUTCString() : null, 
                     'enddate':enddate ? enddate.toUTCString() : null, 
                     'goals':goals});
      
    };
        
});
app.factory('Goals',function ($http) {
  model = {};
    model.list = [];

    model.get = function (){
      var colors = ['A200BF','00757F','FFCC00','0001CF', '00E526', 
                'BF7200', '7F0072', 'FFDC00', 'CF0007'];
      
      return $http.get('/api/v1/goals').success(function(data){
        
        model.list = [];
        
        for(var index = 0; index<data.goals.length; index++){
          var goal = data.goals[index];
          goal.color = colors[index%colors.length];
          model.list.push(goal);
        }
       
      
      });
    }

    model.add = function (goal) {
      return $http.post('/api/v1/goals',{'name':goal.name, 
                                         'weight':goal.weight,
                                         'gid':goal.gid});
    };

    return model;
        
});

app.service('History', function ($http) {
  var today = new Date();
  today.setHours(0,0,0,0);
  this.getTimeSlots = function(){
    var timeslots = [];
    // POPULATE TIMESLOT LIST.. PRETTY UGLY

    for(var i = 0; i<48; i++){
      var timeslot = new Date();
      timeslot.setHours( ((i/2) | 0), (i%2 == 0 ? 0 : 30) , 0 );

      timeslots.push({'time':timeslot, 
                            'start':timeslot.toTimeString().slice(0,5),
                            'task':''});
    }
    return timeslots;
  };
  this.get = function(date){
    return  $http({ url: '/api/v1/history',
                    method: "GET",
                    params: {'day':date}
                });
  };
  this.getBreakdown = function (){
    y = today.getFullYear(), m = today.getMonth();
    var week = new Date(y, m, today.getDate() - today.getDay()+1);
    var month = new Date(y, m, 1); // first day of month


    return this.get(month.toUTCString()).then(function (data){
      var bymonth = data.data.history;
      var byweek = [];
      var byday = [];
      var t,d;
      for(var i = 0; i < bymonth.length; i++){
        t = bymonth[i];
        d = new Date(t.time);
        if (d > week){
          byweek.push(t);
        }
        if (d > today){
          byday.push(t);
        }
      }
      return {'month':bymonth,'week':byweek,'day':byday};
    });

    console.log(today,week,month);

    var month = new Date(week);
    return [];
  };
  this.getToday = function(){
    return  this.get(today.toUTCString());
  };

  this.add = function (history) {
    return $http.post('/api/v1/history',{'valence':history.valence,
                                         'intensity':history.intensity,
                                         'tid':history.task ? history.task.tid : 'RESET',
                                         'time':history.time.toUTCString()});
  };
});