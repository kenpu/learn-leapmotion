function translate(x, y) {
  return 'translate(' + x + "," + y + ")";
}

// Checkboxes control existence of value in an array

var app = angular.module('layoutlist', []);

app.controller('MainController', function($scope) {
  $scope.objects = [
    {name: "Ken Pu", office: 'UA'},
    {name: "Jeremy Bradbury", office: "UB"},
    {name: "Mark Green", office: "UC"}
  ];

  $scope.selected = {

  };

  $scope.labeler = function(object) {
    return object.name + "@" + object.office;
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
      console.debug("linking...", $scope)
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

      // create circles
      gnodes.append("circle")
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 30)
        .attr('fill', function(object, i) {return color(i)});

      // create labels
      gnodes.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .text(function(object) {return $scope.labeler(object)});

      var force = d3.layout.force()
        .size([width, height])
        .nodes(objects)
        .charge(-1000)
        .on('tick', tick);

      gnodes.call(force.drag);

      function tick(e) {
        svg.selectAll('g.node').attr('transform', function(object) {
          return translate(object.x, object.y);
        });

        var path = "M" + d3.geom.hull(objects).map(function(p) { return p.x + " " + p.y}).join("L") + "Z";
        hull.attr('d', path);
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
