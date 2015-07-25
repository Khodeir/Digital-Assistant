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

  this.add = function (valence,intensity,tid,time) {
    return $http.post('/api/v1/history',{'valence':valence, 'intensity':intensity,'tid':tid,'time':time});
  };
});