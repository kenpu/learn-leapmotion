var app = angular.module('leapapp', []);

app.controller('LeapCtrl', function($scope, $window) {
    $scope.looping = false;
    $scope.leap = {};

    $scope.doLeap = function(frame) {
        if($scope.looping) {
            $scope.$apply(function() {
                $scope.leap.hands = frame.hands;
                $scope.leap.currentFrameRate = frame.currentFrameRate;
            });
        }
    };

    $scope.hasHands = function() {
        return ($scope.leap.hands 
             && $scope.leap.hands.length > 0) ? true : false;
    };

    // initialize

    $scope.controller = new Leap.Controller({enableGesture: false});
    $scope.controller.loop($scope.doLeap);
    $window.$scope = $scope;
});
