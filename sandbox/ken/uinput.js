/**
 * User input streams from Leap controllers
 */


/* ==== RelativeVector ===== */

function RelVector(width, height, x0, y0) {
    this.width = width,
    this.height = height,
    this.x0 = x0,
    this.y0 = y0;
    this.reset()
}
RelVector.prototype.reset = function() {
    this.x = this.x0,
    this.y = this.y0;
}
RelVector.prototype.move = function(dx, dy) {
    this.x += dx;
    this.y += dy;
}
RelVector.prototype.jump = function(x, y) {
    this.x = x;
    this.y = y;
}

/* ===== Streamers ========= */

function HandFilter(anotherFilter) {
    this.restPalm = null;
    this.state = 'CLOSED';
    this.anotherFilter = anotherFilter;
}
HandFilter.prototype.connect = function(f) {
    this.anotherFilter = f;
}
HandFilter.prototype.consume = function(x) {
    console.debug("handFilter:", this.state);
    if(x.hand && x.hand.fingers.length == 5) {
        // transition
        if(this.state == 'CLOSED') {
            this.restPalm = x.palm.slice();
        }
        this.state = 'OPEN';
        // compute deltas
        var y = [x.palm[0] - this.restPalm[0],
                 x.palm[1] - this.restPalm[1],
                 x.palm[2] - this.restPalm[2]];
        if(this.anotherFilter) this.anotherFilter.consume(y);
    } else {
        // transition
        if(this.state == 'OPEN') {
            this.restPalm = null;
            this.anotherFilter && this.anotherFilter.consume(null);
        }
        this.state = 'CLOSED';
    }
}

function Mover(width, height, sensitivity) {
    this xy = new RelVector(width, height, width/2, height/2);
    this.sensivitity = sensitivity;
}
Mover.prototype.consume = function(da) {
    if(da == null)
        xy.reset();
    else {
        var dx = da[0] * this.sensitivity;
        var dy = da[2] * this.sensitivity;
        xy.move(dx, dy);
    }
    return {
        x: xy.x,
        y: xy.y
    }
}


/* ===== NgScope =========== */

function NgScope($scope, key) {
    this.$scope = $scope;
    this.key = key;
}
NgScope.prototype.consume = function(x) {
    var self = this;
    self.$scope.$apply(function() {
        self.$scope[self.key] = x;
    });
}

/* ===== Leap stream ======= */

function LeapStream() {
    var leapLoop = new Leap.Controller({enableGesture: false});
    var self = this;
    self.callbacks = [];

    leapLoop.loop(function(frame) {
        var hand = null,
            finger = null,
            palm,
            pointer;
        
        if(frame.hands.length > 0) {
            hand = frame.hands[0];
            palm = hand.palmNormal;
            if(hand.fingers.length > 0) {
                finger = hand.fingers[0];
                pointer = finger.direction;
            }
        }

        var x = {
            hand: hand,
            finger: finger,
            palm: palm,
            pointer: pointer
        }

        self.callbacks.forEach(function(f) {
            f.consume(x);
        });
    });
}
LeapStream.prototype.connect = function(f) {
    this.callbacks.push(f);
}


