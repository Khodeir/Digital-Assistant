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

app.service('History', function ($http) {
  var today = new Date;
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);
  today.setMilliseconds(0);
  this.getTimeSlots = function(){
    var timeslots = [];
    // POPULATE TIMESLOT LIST.. PRETTY UGLY
    var initial_hour = 8;
    for(var i = 0; i<24; i++){
      var timeslot = new Date(today);
      timeslot.setHours(initial_hour+(i/2) | 0);
      if (i % 2 != 0) timeslot.setMinutes(30);
      timeslots.push({'time':timeslot, 
                            'start':timeslot.toTimeString().slice(0,5),
                            'task':''});
    }
    return timeslots;
  };

  this.getToday = function(){
    return  $http({ url: '/api/v1/history',
                    method: "GET",
                    params: {'day':today.toUTCString()}
                });
  };

  this.add = function (valence,intensity,tid,time) {
    return $http.post('/api/v1/history',{'valence':valence, 'intensity':intensity,'tid':tid,'time':time});
  };
});