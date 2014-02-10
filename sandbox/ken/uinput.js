/**
 * User input streams from Leap controllers
 */


/* ===== Streamers ========= */

/**
 * sending a data downstream of a streamer
 */
function _yield(streamer, data) {
    if(streamer.downstream && streamer.downstream.length > 0) {
        streamer.downstream.forEach(function(d) {
            d.consume(data);
        });
    }
}

/**
 * connects downstream to upstream
 */
function _connect(upstream, downstream) {
    if(upstream.downstream == null) {
        upstream.downstream = [];
    }
    upstream.downstream.push(downstream);
}
/**
 * Chain connect a series of streamers
 */
function Connect() {
    for(var i=1; i < arguments.length; i++) {
        _connect(arguments[i-1], arguments[i]);
    }
}

/**
 * Input: raw Leap frames
 */
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
        self.downstream.forEach(function(f) {
            f.consume(frame);
        });
    });
}

/* ======= Jan 27: Dominant hand filter ========== */

/**
 * Identify dominant hand
 * Input:
 *      Leapstream
 * Output:
 *      Stream<Hand>
 */
function DominantHandFilter(freqThreshold) {
    this.counter = {};
    this.c0 = freqThreshold;
    this.domHandId = null;
    this.domHandFreq = 0;
    this.stabilized = false;
}
DominantHandFilter.prototype.updateCounter = function(hand) {
    var id = hand.id;
    if(this.counter[id] == null) {
        this.counter[id] = 1;
    } else {
        this.counter[id] += 1;
    }
    if(this.counter[id] > this.domHandFreq) {
        this.domHandId = id;
        this.domHandFreq = this.counter[id];
    }
}
DominantHandFilter.prototype.reset = function() {
    this.counter = {};
    this.stabilized = false;
    this.domHandId = null;
    this.domHandFreq = 0;
}

DominantHandFilter.prototype.consume = function(frame) {
    var self = this;

    if(frame.hands.length == 0) {
        self.reset();
        _yield(self, null);
        return
    }

    // identify the dominant hand
    if(! self.stabilized) {
        frame.hands.forEach(function(hand) {
            self.updateCounter(hand);
        });

        if(self.domHandFreq > self.c0) {
            self.stabilized = true;
        }
        
        _yield(self, null);
    } else {
        var domHand;
        frame.hands.forEach(function(hand) {
            if(hand.id == self.domHandId) {
                domHand = hand;
                return false;
            }
        });
        if(domHand) {
            _yield(self, domHand);
        } else {
            self.reset();
            _yield(self, null);
        }
    }
}

function DominantPointerFilter() {
    var state = 'closed'; // 'open', 'ptr', 'ptr-stable'
    var domFinger = null, domFreq = 0;
    var count = {};
}
DominantPointerFilter.prototype.consume = function(hand) {
    var self = this;
    if(! hand) {
        this.state = 'closed';
    } else {
        var fingers = hand.fingers.length;
        if(fingers == 0) {
            this.state = 'closed';
        } else if(fingers >= 3) {
            this.state = 'open';
        } else {
            this.state = 'ptr';
        }
    }

    if(this.state == 'ptr') {
        this.updateCount(hand.fingers);
        if(this.domFreq > 10) {
            this.updateHand(hand);
        }
    } else {
        this.reset();
    }

    _yield(self, hand);
}
DominantPointerFilter.prototype.updateCount = function(fingers) {
    var self = this;
    fingers.forEach(function(finger) {
        self.count[finger.id] = (self.count[finger.id] != null) ? (self.count[finger.id]+1) : 1;
        if(self.count[finger.id] > self.domFreq) {
            self.domFinger = finger;
            self.domFreq = self.count[finger.id];
        }
    });
}
DominantPointerFilter.prototype.updateHand = function(hand) {
    hand.pointer = this.domFinger.direction.slice();
    hand.tip = this.domFinger.stabilizedTipPosition.slice();
}
DominantPointerFilter.prototype.reset = function() {
    this.count = {};
    this.domFinger = null;
    this.domFreq = 0;
}

/**
 * DebugHand
 */
function DebugFilter(element) {
    this.element = $(element);
}
DebugFilter.prototype.consume = function(hand) {
    var angles, pos;
    if(hand == null) {
        angles = [0, 0, 0];
        pos = [0, 0, 0];
        ptr = [0, 0, 0];
    } else {
        angles = hand.palmNormal.slice();
        pos    = hand.stabilizedPalmPosition.slice();
        ptr    = (hand.pointer) ? hand.pointer.slice() : [0,0,0];
    }
    if(this.element) {
        var element = this.element;
        element.find(".angle-x").text(sprintf("%2.2f", angles[0]));
        element.find(".angle-y").text(sprintf("%2.2f", angles[1]));
        element.find(".angle-z").text(sprintf("%2.2f", angles[2]));

        element.find(".position-x").text(sprintf("%2.2f", pos[0]));
        element.find(".position-y").text(sprintf("%2.2f", pos[1]));
        element.find(".position-z").text(sprintf("%2.2f", pos[2]));

        element.find(".pointer-x").text(sprintf("%2.2f", ptr[0]));
        element.find(".pointer-y").text(sprintf("%2.2f", ptr[1]));
        element.find(".pointer-z").text(sprintf("%2.2f", ptr[2]));
    }

    _yield(this, hand);
}



/**
 * Normalize
 * Input:
 *      Stream<Hand>
 * Output:
 *      Stream<palm: AngleVec, pos: PositionVec>
 */
function Normalize() {
}
Normalize.prototype.normalize = function(x, xmin, xmax, ymin, ymax) {
    x = Math.min(x, xmax);
    x = Math.max(x, xmin);
    var y = ymin + (x - xmin)/(xmax-xmin) * (ymax - ymin);
    return y;
}

Normalize.prototype.consume = function(hand) {
    if(hand) {
        //
        // normalize palm normal vector to [0 1]
        //
        var a0 = hand.palmNormal[0];
        var a1 = hand.palmNormal[1];
        var a2 = hand.palmNormal[2];
        a0 = this.normalize(a0, -1, 1, 0, 1.0);
        a1 = this.normalize(a1, -1, 1, 0, 1.0);
        a2 = this.normalize(a2, -0.7, 0.7, 0, 1.0);
        hand.palmNormal = [a0, a1, a2];

        //
        // normalize palm position to [0 1]
        //
        var p0 = hand.stabilizedPalmPosition[0];
        var p1 = hand.stabilizedPalmPosition[1];
        var p2 = hand.stabilizedPalmPosition[2];
        p0 = this.normalize(p0, -150, 150, 0, 1.0);
        p1 = this.normalize(p1, 50, 300, 1.0, 0);
        p2 = this.normalize(p2, -150, 150, 0, 1.0);
        hand.stabilizedPalmPosition = [p0, p1, p2];

        //
        // normalize pointer vector to [0 1]
        //
        if(hand.pointer) {
            var a0 = hand.pointer[0];
            var a1 = hand.pointer[1];
            var a2 = hand.pointer[2];
            a0 = this.normalize(a0, -1, 1, 0, 1.0);
            a1 = this.normalize(a1, -1, 1, 0, 1.0);
            a2 = this.normalize(a2, -0.7, 0.7, 0, 1.0);
            hand.pointer = [a0, a1, a2];
        }
    }
    _yield(this, hand);
}


