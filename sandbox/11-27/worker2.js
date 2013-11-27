// Checkboxes control existence of value in an array
var app = angular.module('layoutlist', []);

app.controller('MainController', function($scope) {
  $scope.instructors = ['Dr. Aruliah', 'Dr. Bradbury', 'Dr. Collins', 'Dr. Green', 'Dr. Pu', 'Dr. Qureshi'];
  $scope.selected_instructors = [];
  $scope.courses = ['CSCI 3020U', 'CSCI 3030U', 'CSCI 3070U', 'CSCI 3090U', 'CSCI 4100U', 'CSCI 4110U', 'CSCI 4120U', 'CSCI 4130U', 'CSCI 4020U'];
  $scope.selected_courses = [];
  $scope.rooms = ['J123A','UA1240U','UA1350','UA2120','UB2050'];
  $scope.selected_rooms = [];
});

app.directive('circleGraph',function() {
	return {
		restrict: 'E',
		scope: {
		},
		link: function (scope, element, attrs) {
		var w = 200, h = 200;
        var color = d3.scale.category20();
		var instructors = ['Dr. Aruliah', 'Dr. Bradbury', 'Dr. Collins', 'Dr. Green', 'Dr. Pu', 'Dr. Qureshi'];
        var svg = d3.select('body').append('svg').attr('width', w).attr('height', h);

        var data = [], textlabels = [],
            MAX_SIZE = 5,
            NUM_BALLS = 10;

        for(var i=0; i < instructors.length; i++) {
            data.push({
                size: MAX_SIZE,
                x: Math.random() * w,
                y: Math.random() * h
            });
        }
		
		for(var j = 0; j < instructors.length; j++) {
		textlabels.push({
			name: instructors[j],
			x: data[j].x,
			y: data[j].y
		});
		}

        var force = d3.layout.force()
            .size([w, h])
            .charge(-15)
            .friction(0.9)
            .nodes(data)
            .on('tick', updateXY);
			
		var gnodes = svg.append("g");

        var circles = gnodes.selectAll('node');

        circles = circles.data(data)
        .enter()
            .append('circle')
            .attr('class', 'circle')
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; })
            .attr('r', function(d) { return d.size; })
            .attr('fill', function(d, i) { return color(i); })
            .call(force.drag)
            ;
			
		var labels = gnodes.selectAll('node');
		
		labels = labels.data(textlabels)
		.enter()
			.append('text')
			.attr("x", function (d) {return d.x;})
			.attr("y", function (d) {return d.y;})
			.text(function(d) {return d.name;})
			;
			
        function updateXY() {
            // collision resolution
            var qt = d3.geom.quadtree(data);
            for(var i=0; i < data.length; i++) {
                qt.visit(resolve(data[i]));
            }

            // repaint the svg elements

            circles
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; });
			
			labels
			.attr("x", function(d) {return d.x + 2;})
			.attr("y", function(d) {return d.y - 5;})
        }
		


        function resolve(vertex) {
            var r = vertex.size + MAX_SIZE,
                nx1 = vertex.x - r,
                nx2 = vertex.x + r,
                ny1 = vertex.y - r,
                ny2 = vertex.y + r;

            return function(quad, x1, y1, x2, y2) {
                if(quad.point && (quad.point != vertex)) {
                    var x = vertex.x - quad.point.x,
                        y = vertex.y - quad.point.y,
                        l = Math.sqrt(x*x + y*y),
                        r = vertex.size + quad.point.size;
                    if(l < r) { // collision
                        l = (l - r) / l * 0.1;
                        x *= l; vertex.x -= x;
                        y *= l; vertex.y -= y;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            };
        }

        force.start();
		}
	}
});

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
