// Checkboxes control existence of value in an array
var app = angular.module('task', []);

app.controller('MainController', function($scope) {
  $scope.instructors = ['Dr. Aruliah', 'Dr. Bradbury', 'Dr. Collins', 'Dr. Green', 'Dr. Pu', 'Dr. Qureshi'];
  $scope.selected_instructors = [];
  $scope.courses = ['CSCI 3020U', 'CSCI 3030U', 'CSCI 3070U', 'CSCI 3090U', 'CSCI 4100U', 'CSCI 4110U', 'CSCI 4120U', 'CSCI 4130U', 'CSCI 4020U'];
  $scope.selected_courses = [];
  $scope.rooms = ['J123A','UA1240U','UA1350','UA2120','UB2050'];
  $scope.selected_rooms = [];
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
