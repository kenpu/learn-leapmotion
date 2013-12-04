function translate(x, y) {
  return 'translate(' + x + "," + y + ")";
}

// Checkboxes control existence of value in an array

var app = angular.module('layoutlist', []);
var svgWidth;
var svgHeight;

app.controller('MainController', function($scope) {
  $scope.professors = [
    {name: "Ken Pu", office: "UA"},
    {name: "Jeremy Bradbury", office: "UB"},
    {name: "Mark Green", office: "UC"},
  ];
  $scope.students = [
    {name: "Michael Ferron", office: "Brampton"},
	{name: "Taurean Scantlebury", office: "Scarborough"},
	{name: "Arnold Cheng", office: "Toronto"},
	{name: "David Nemirovsky", office: "Downtown"},
	{name: "Carly Marshall", office: "Belleville"}
  ];

  $scope.selected = {

  };

  $scope.labeler = function(object) {
    return object.name + ", " + object.office;
  };
});

app.directive('d3checkbox', function() {
  return {
    restrict: 'E',
    template: "<svg></svg>",
    replace: true,
    scope: {
      objects: "=",
      labeler: "=",
      save: "="
    },
    link: function($scope, element, attrs) {
      //console.debug("linking...", $scope)
      var objects = $scope.objects;
      var save = $scope.save;
      var color = d3.scale.category20();

      var svg = d3.select(element[0]);
      var width = parseInt(attrs.width);
      var height = parseInt(attrs.height);

      var hull = svg.append("path")
        .style('fill', 'gray')
        .style('stroke', 'gray')
        .style('stroke-width', 120)
        .style('stroke-linejoin', 'round')
        .attr('class', 'hull')
        .attr('opacity', 0.2);

      var gnodes = svg.selectAll("g.node").data(objects);
      gnodes.enter()
        .append("g").attr('class', 'node')
        .attr('transform', function(object, i) {
          return translate(0, 0);
        }).
        on('click', function(object) {
          $scope.$apply(function() {
            var name = $scope.labeler(object);
            save[name] = ! save[name];
            if(! save[name]) delete save[name];
            console.debug("saving", name, 'in', save);            
          })
        });

     gnodes.append("circle")
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 20)
        .attr('fill', function(object, i) {return color(i)});

      gnodes.append('text')
        .attr('x', 30)
        .attr('y', -20)
        .text(function(object) {return $scope.labeler(object)});

      var force = d3.layout.force()
        .size([width, height])
        .nodes(objects)
        .charge(-400)
        .on('tick', tick);
		
      gnodes.call(force.drag);

      function tick(e) {
        svg.selectAll('g.node').attr('transform', function(object) {
          return translate(object.x, object.y);
        });

		//Hull doesn't map >3 objects, cause unknown...
		//
        var path = "M" + d3.geom.hull(objects).map(function(p) { return p.x + " " + p.y}).join("L") + "Z";
        hull.attr('d', path);
      }

      force.start();
	  /* Traditional HTML, leap code goes here. Can't directly with Angular, what do?
	  Directive can't access sv
	  */
    }
  }
});

/*app.directive('fingerCursor',function(){
	return {
	scope:{
	//is scope necessary?
	},
	link: function(scope, elements, attrs){
	var svg = d3.select(elements[0]);
	}
	};
});*/
	
app.directive('checkList', function() {
  return {
    scope: {
      list: '=checkList',
      value: '@'
    },
    link: function(scope, elem, attrs) {
      var handler = function(setup) {
        var checked = elem.prop('checked');
        var index = scope.list.indexOf(scope.value);

        if (checked && index == -1) {
          if (setup) elem.prop('checked', false);
          else scope.list.push(scope.value);
        } else if (!checked && index != -1) {
          if (setup) elem.prop('checked', true);
          else scope.list.splice(index, 1);
        }
      };
      
      var listSetupHandler = handler.bind(null, true);
      var listChangeHandler = handler.bind(null, false);
            
      elem.on('change', function() {
        scope.$apply(listChangeHandler);
      });
      scope.$watch('list', listSetupHandler, true);
    }
  };
});

//Leap service injection for use with Angular
app.factory('leap-service', function ($log, $scope){
	var Leap;
	
	function initialize() {
		Leap = new WebSocket("ws//localhost:6437/");
		
		Leap.onopen = function(event) {
			$log.info("Connection to Leap WebSocket was successful");
		};
		
		Leap.onmessage = function(event) {
		$scope.$broadcast("LeapData", $.parseJSON(event.data));};
		
		Leap.onclose = function(event) {
		Leap = null;
		$log.info("Connection to Leap WebSocket was closed");
		};
		
		Leap.onerror = function(event) {
		alert("Error occurred");
		};
	}
	
	initialize();
	return leap
});