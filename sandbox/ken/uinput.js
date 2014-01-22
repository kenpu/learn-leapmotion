/**
 * User input streams from Leap controllers
 */


/* ===== Streamers ========= */

function _yield(streamer, data) {
    if(streamer.downstream && streamer.downstream.length > 0) {
        streamer.downstream.forEach(function(d) {
            d.consume(data);
        });
    }
}

function _connect(upstream, downstream) {
    if(upstream.downstream == null) {
        upstream.downstream = [];
    }
    upstream.downstream.push(downstream);
}
function Connect() {
    for(var i=1; i < arguments.length; i++) {
        _connect(arguments[i-1], arguments[i]);
    }
}

function HandFilter() {
    this.restPalm = null;
    this.state = 'CLOSED';
}
HandFilter.prototype.consume = function(x) {
    console.debug("handFilter:", this.state);
    if(x.hand && x.hand.fingers.length >= 2) {
        // transition
        if(this.state == 'CLOSED') {
            this.restPalm = x.palm.slice();
        }
        this.state = 'OPEN';
        // compute deltas
        var y = [x.palm[0] - this.restPalm[0],
                 x.palm[1] - this.restPalm[1],
                 x.palm[2] - this.restPalm[2]];
        _yield(this, y);
    } else {
        // transition
        if(this.state == 'OPEN') {
            this.restPalm = null;
            _yield(this, null);
        }
        this.state = 'CLOSED';
    }
}

function ScalingAngles() {
}
ScalingAngles.prototype.consume = function(ang) {
    if(ang == null) 
        _yield(this, null)
    else {
        var x = [0, 0, 0];
        x[0] = Math.min(Math.max(ang[0], -0.5), 0.5);
        x[1] = Math.min(Math.max(ang[1], -0.5), 0.5);
        x[2] = Math.min(Math.max(ang[2], -0.5), 0.5);
        _yield(this, x);
    }
}

function Mover(width, height, sensitivity) {
    this.x = width / 2;
    this.y = height /2;
    this.width = width,
    this.height = height;
    this.sensitivity = sensitivity;
}
Mover.prototype.consume = function(da) {
    if(da == null) {
        ;
    } else {
        var dx = da[0] * this.sensitivity;
        var dy = da[2] * this.sensitivity;
        this.x += dx;
        this.y += dy;
        this.x = Math.min(Math.max(this.x, 0), this.width);
        this.y = Math.min(Math.max(this.y, 0), this.height);
    }
    var xy = { x: this.x, y: this.y };
    _yield(this, xy);
}


/* ===== NgScope =========== */

function NgScope($scope, key) {
    this.$scope = $scope;
    this.key = key;
}
NgScope.prototype.consume = function(x) {
    console.debug("ngscope", this.key, x);
    var self = this;
    self.$scope.$apply(function() {
        self.$scope[self.key] = x;
    });
}

/* ===== Leap stream ======= */

function LeapStream() {
    var leapLoop = new Leap.Controller({enableGesture: false});
    var self = this;
    self.downstream = [];

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

        self.downstream.forEach(function(f) {
            f.consume(x);
        });
    });
}
