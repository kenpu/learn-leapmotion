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
function DomhandFilter(freqThreshold) {
    this.counter = {};
    this.c0 = freqThreshold;
    this.domHandId = null;
    this.domHandFreq = 0;
    this.stablized = false;
}
DomhandFilter.prototype.updateCounter = function(hand) {
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
DomhandFilter.prototype.reset = function() {
    this.counter = {};
    this.stablized = false;
    this.domHandId = null;
    this.domHandFreq = 0;
}

DomhandFilter.prototype.consume = function(frame) {
    var self = this;

    if(frame.hands.length == 0) {
        self.reset();
        _yield(self, null);
        return
    }

    // identify the dominant hand
    if(! self.stablized) {
        frame.hands.forEach(function(hand) {
            self.updateCounter(hand);
        });

        if(self.domHandFreq > self.c0) {
            self.stablized = true;
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
    } else {
        angles = hand.palmNormal.slice();
        pos    = hand.stabilizedPalmPosition.slice();
    }
    if(this.element) {
        var element = this.element;
        element.find(".angle-x").text(sprintf("%2.2f", angles[0]));
        element.find(".angle-y").text(sprintf("%2.2f", angles[1]));
        element.find(".angle-z").text(sprintf("%2.2f", angles[2]));

        element.find(".position-x").text(sprintf("%2.2f", pos[0]));
        element.find(".position-y").text(sprintf("%2.2f", pos[1]));
        element.find(".position-z").text(sprintf("%2.2f", pos[2]));
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
        var a0 = hand.palmNormal[0];
        var a1 = hand.palmNormal[1];
        var a2 = hand.palmNormal[2];
        a0 = this.normalize(a0, -1, 1, 0, 1.0);
        a1 = this.normalize(a1, -1, 1, 0, 1.0);
        a2 = this.normalize(a2, -0.7, 0.7, 0, 1.0);
        hand.palmNormal = [a0, a1, a2];

        var p0 = hand.stabilizedPalmPosition[0];
        var p1 = hand.stabilizedPalmPosition[1];
        var p2 = hand.stabilizedPalmPosition[2];
        p0 = this.normalize(p0, -150, 150, 0, 1.0);
        p1 = this.normalize(p1, 50, 300, 1.0, 0);
        p2 = this.normalize(p2, -150, 150, 0, 1.0);
        hand.stabilizedPalmPosition = [p0, p1, p2];
    }
    _yield(this, hand);
}

function PanelUpdater(zoomPanel, regPanel) {
	var finePanel = document.getElementById(zoomPanel).innerHTML;
	var coarsePanel = document.getElementById(regPanel).innerHTML;
	
	var allObjects = coarsePanel.selectAll('circle');
	var dispObjects = [];
	//retrieve objects from coarsePanel's svg
	//determine distance of objects from cursor circle
	
	//place objects that fit criteria into dispObjects
	//use # of objects to determine spacing
	var spacing = dispObjects.length;
	var shiftAngle = 360/spacing;
	//place objects around cursor in finePanel in a circle
	for (int i = 0; i < spacing; i++){
	}
}