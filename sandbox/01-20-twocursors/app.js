var app = angular.module("twocursor", []);

/**
 * leap controller service
 */
app.factory('leap', function() {
	var leapLoop = new Leap.Controller({
		enableGesture: false
	});
	var listeners = [];
	var doLeap = function(frame) {
		// todo: some filtering
		listeners.forEach(function(f) {
			f(frame);
		});
	};

	leapLoop.loop(doLeap);

	return function(callback) {
		listeners.push(callback);
	}
});

app.filter('angles', function() {
	return function(angles) {
		if(angles == null) {
			return "[ --,--,-- ]";
		}
		return "[" + angles.map(function(x) {
			return Math.round(x * 100)/100;
		}).join(",") + "]";
	}
})

app.controller('twocursorCtrl', function($scope, $window, leap) {
	$scope.pointers = {
		p1: [0, 0, 0],
		p2: [0, 0, 0],
	};

	var n = 0;
	var state = 'CLOSED';
	var p1Rest, p2Rest;

	leap(function(frame) {
		frame = clearFrame(frame);
		console.debug("state = ", state);

		if(frame.closed) {
			state = 'CLOSED';
			p1Rest = null;
			$scope.$apply(function() {
				$scope.pointers.p1 = [0, 0, 0];
			});
		} else if(frame.open) {
			// make state transition from closed to open
			if(state == 'CLOSED') {
				state = 'OPEN';
				p1Rest = frame.palm;
			}
			// compute the delta
			if(p1Rest != null) {
				$scope.$apply(function() {
					$scope.pointers.p1 = subtract(frame.palm, p1Rest);
				});
			}
		}
	});

	var width = 800;
	var height = 600;
	var p1 = {
		'x1': width/2,
		'y1': height/2
	}

	$scope.Reset1 = function() {
		p1.x1 = width / 2,
		p1.y1 = height / 2;
	};

	function translate(key, angle, minAng, maxAng, sensitivity) {
		var a = angle;
		if(a <= minAng) a = minAng;
		if(a >= maxAng) a = maxAng;
		p1[key] += a * sensitivity;
		return p1[key];
	};

	$scope.X1 = function() {
		p1.x1 = $scope.pointers.p1[0] * 10 + p1.x1;
		return p1.x1
		
		// return translate('x1', $scope.pointers.p1[0], -0.3, 0.3, 10);
	}
	$scope.Y1 = function() {
		return $scope.pointers.p1[2];
		return translate('y1', $scope.pointers.p1[2], -0.3, 0.3, 10);
	}
});





/** utility functions **/
function clearFrame(frame) {
	var palm = [null, null, null];
	var finger = [null, null, null];
	var hasPalm = false,
		hasFinger = false;

	if(frame.hands.length > 0) {
		palm = frame.hands[0].palmNormal;
		hasPalm = true;
		if(frame.hands[0].fingers.length > 0) {
			finger = frame.hands[0].fingers[0].direction;
			hasFinger = true;
		}
	}
	return {
		palm: palm,
		finger: finger,
		closed: frame.hands.length == 0 ||
				(frame.hands.length > 0 && frame.hands[0].fingers.length == 0),
		open: (frame.hands.length > 0 && frame.hands[0].fingers.length == 5),
		pointing: (frame.hands.length > 0 && frame.hands[0].fingers.length == 1),
		hasPalm: hasPalm,
		hasFinger: hasFinger,
		hasEverything: hasPalm && hasFinger
	}
}

function subtract(v1, v2) {
	return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]]
}

function Position(x0, y0) {
    this.x = x0;
    this.y = y0;
}
Position.prototype.dx = function (dx){
    this.x += dx;
}
Position.prototype.dy = function (dy){
    this.y += dy;
}
