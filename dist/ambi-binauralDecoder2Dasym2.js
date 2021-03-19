'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

////////////////////////////////////////////////////////////////////
//  Archontis Politis
//  archontis.politis@aalto.fi
//  David Poirier-Quinot
//  davipoir@ircam.fr
////////////////////////////////////////////////////////////////////
//
//  JSAmbisonics a JavaScript library for higher-order Ambisonics
//  The library implements Web Audio blocks that perform
//  typical ambisonic processing operations on audio signals.
//
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//
//  binDecoder for 2D use
//  adapted by Thomas Deppisch
//  thomas.deppisch93@gmail.com
//
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//
//  binDecoder for 2D using asyymetrical filters for room modelling
//  adapted by Bruce Wiggins & Mark Dring
//  b.j.wiggins@derby.ac.uk
//  m.dring@derby.ac.uk
//
////////////////////////////////////////////////////////////////////
/////////////////////////////
/* HOA BINAURAL DECODER 2D Aymmetric Filters */
/////////////////////////////

// NOTE THAT CURRENT LIMIT IS 15th ORDER
var binDecoder2Dasym2 = function () {
    function binDecoder2Dasym2(audioCtx, order) {
        (0, _classCallCheck3.default)(this, binDecoder2Dasym2);


        this.initialized = false;

        this.ctx = audioCtx; //Audio Context
        this.order = order; //What's the order?
        this.nCh = 2 * order + 1; // no of circular harmonics
        //this.decFilters = new Array(this.nCh);                      // no of filters (will be double for asym
        //this.decFilterNodes = new Array(this.nCh);             // no of filter nodes (will be double for asym)
        // WIG EDIT
        this.decFiltersL = new Array(this.nCh); // no of filters (will be double for asym
        this.decFilterNodesL = new Array(this.nCh); // no of filter nodes (will be double for asym)
        this.decFiltersR = new Array(this.nCh); // no of filters (will be double for asym
        this.decFilterNodesR = new Array(this.nCh); // no of filter nodes (will be double for asym)
        // END of EDIT

        // input and output nodes
        // WIG EDIT
        this.inL = this.ctx.createChannelSplitter(this.nCh); // split input into nchannels (not sure if needs changing)
        this.inR = this.ctx.createChannelSplitter(this.nCh);
        // END of EDIT
        this.out = this.ctx.createChannelMerger(2); // output node merges back in to 2 channels
        this.out.channelCountMode = 'explicit';
        this.out.channelCount = 1; // probably needs to be 2 for asym????
        // downmixing gains for left and right ears
        this.gainMid = this.ctx.createGain();
        this.gainSide = this.ctx.createGain();
        this.invertSide = this.ctx.createGain();
        this.gainMid.gain.value = 1;
        this.gainSide.gain.value = 1;
        this.invertSide.gain.value = -1;
        // convolver nodes

        // WIG EDIT double the number of filters
        //for (var i = 0; i < this.nCh; i++) {
        for (var i = 0; i < this.nCh; i++) {
            this.decFilterNodesL[i] = this.ctx.createConvolver();
            this.decFilterNodesL[i].normalize = false;
            this.decFilterNodesR[i] = this.ctx.createConvolver();
            this.decFilterNodesR[i].normalize = false;
        }
        // END of EDIT

        // initialize convolvers to plain cardioids
        this.resetFilters();
        // create audio connections
        // WIG EDIT
        for (var i = 0; i < this.nCh; i++) {
            this.inL.connect(this.decFilterNodesL[i], i, 0);
            this.inR.connect(this.decFilterNodesR[i], i, 0); // connect channel i of input to channel i+nCh 
            // of filterNode
            this.decFilterNodesL[i].connect(this.out, 0, 0); // send ch 0 of filter to Left of output
            this.decFilterNodesR[i].connect(this.out, 0, 1); // send ch 0 of filter to Right of output

            //if ((i%2) == 0) this.decFilterNodes[i].connect(this.gainMid); //even numbers to mid signal
            //else this.decFilterNodes[i].connect(this.gainSide); //odd numbers to side signal
        }
        //this.gainMid.connect(this.out, 0, 0);
        //this.gainSide.connect(this.out, 0, 0);

        //this.gainMid.connect(this.out, 0, 1);
        //this.gainSide.connect(this.invertSide, 0, 0);
        //this.invertSide.connect(this.out, 0, 1);
        // END of EDIT
        this.initialized = true;
    }

    (0, _createClass3.default)(binDecoder2Dasym2, [{
        key: 'updateFilters',
        value: function updateFilters(audioBufferL, audioBufferR) {
            // assign filters to convolvers
            //WIG EDIT we now should have twice the number of filters using two separate filter banks
            //for (var i = 0; i < this.nCh; i++) {
            for (var i = 0; i < this.nCh; i++) {
                this.decFiltersL[i] = this.ctx.createBuffer(1, audioBufferL.length, audioBufferL.sampleRate);
                this.decFiltersL[i].getChannelData(0).set(audioBufferL.getChannelData(i));

                this.decFiltersR[i] = this.ctx.createBuffer(1, audioBufferR.length, audioBufferR.sampleRate);
                this.decFiltersR[i].getChannelData(0).set(audioBufferR.getChannelData(i));

                this.decFilterNodesL[i].buffer = this.decFiltersL[i];
                this.decFilterNodesR[i].buffer = this.decFiltersR[i];
            }
        }
    }, {
        key: 'resetFilters',
        value: function resetFilters() {
            // overwrite decoding filters (plain cardioid virtual microphones)
            var cardGains = new Array(this.nCh);
            cardGains.fill(0);
            cardGains[0] = 0.5;
            cardGains[1] = 0.5 / Math.sqrt(3);
            //WIG EDIT should have double the number of filters now
            for (var i = 0; i < this.nCh; i++) {
                //for (var i = 0; i < this.nCh; i++) {
                // ------------------------------------
                // This works for Chrome and Firefox:
                // this.decFilters[i] = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
                // this.decFilters[i].getChannelData(0).set([cardGains[i]]);
                // ------------------------------------
                // Safari forces us to use this:
                this.decFiltersL[i] = this.ctx.createBuffer(1, 64, this.ctx.sampleRate);
                this.decFiltersR[i] = this.ctx.createBuffer(1, 64, this.ctx.sampleRate);
                // and will send gorgeous crancky noise bursts for any value below 64
                for (var j = 0; j < 64; j++) {
                    this.decFiltersL[i].getChannelData(0)[j] = 0.0;
                    this.decFiltersR[i].getChannelData(0)[j] = 0.0;
                }
                this.decFiltersL[i].getChannelData(0)[0] = cardGains[i];
                this.decFiltersR[i].getChannelData(0)[0] = cardGains[i];
                // ------------------------------------
                this.decFilterNodesL[i].buffer = this.decFiltersL[i];
                this.decFilterNodesR[i].buffer = this.decFiltersR[i];
            }
        }
    }]);
    return binDecoder2Dasym2;
}();

exports.default = binDecoder2Dasym2;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFtYmktYmluYXVyYWxEZWNvZGVyMkRhc3ltMi5qcyJdLCJuYW1lcyI6WyJiaW5EZWNvZGVyMkRhc3ltMiIsImF1ZGlvQ3R4Iiwib3JkZXIiLCJpbml0aWFsaXplZCIsImN0eCIsIm5DaCIsImRlY0ZpbHRlcnNMIiwiQXJyYXkiLCJkZWNGaWx0ZXJOb2Rlc0wiLCJkZWNGaWx0ZXJzUiIsImRlY0ZpbHRlck5vZGVzUiIsImluTCIsImNyZWF0ZUNoYW5uZWxTcGxpdHRlciIsImluUiIsIm91dCIsImNyZWF0ZUNoYW5uZWxNZXJnZXIiLCJjaGFubmVsQ291bnRNb2RlIiwiY2hhbm5lbENvdW50IiwiZ2Fpbk1pZCIsImNyZWF0ZUdhaW4iLCJnYWluU2lkZSIsImludmVydFNpZGUiLCJnYWluIiwidmFsdWUiLCJpIiwiY3JlYXRlQ29udm9sdmVyIiwibm9ybWFsaXplIiwicmVzZXRGaWx0ZXJzIiwiY29ubmVjdCIsImF1ZGlvQnVmZmVyTCIsImF1ZGlvQnVmZmVyUiIsImNyZWF0ZUJ1ZmZlciIsImxlbmd0aCIsInNhbXBsZVJhdGUiLCJnZXRDaGFubmVsRGF0YSIsInNldCIsImJ1ZmZlciIsImNhcmRHYWlucyIsImZpbGwiLCJNYXRoIiwic3FydCIsImoiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7SUFDcUJBLGlCO0FBRWpCLCtCQUFZQyxRQUFaLEVBQXNCQyxLQUF0QixFQUE2QjtBQUFBOzs7QUFFekIsYUFBS0MsV0FBTCxHQUFtQixLQUFuQjs7QUFFQSxhQUFLQyxHQUFMLEdBQVdILFFBQVgsQ0FKeUIsQ0FJK0M7QUFDeEUsYUFBS0MsS0FBTCxHQUFhQSxLQUFiLENBTHlC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dEMsSUFBMkNHLFVBQVViLENBQVYsQ0FBM0M7QUFDQTtBQUNBLHFCQUFLaEIsZUFBTCxDQUFxQmdCLENBQXJCLEVBQXdCWSxNQUF4QixHQUFpQyxLQUFLOUIsV0FBTCxDQUFpQmtCLENBQWpCLENBQWpDO0FBQ0EscUJBQUtkLGVBQUwsQ0FBcUJjLENBQXJCLEVBQXdCWSxNQUF4QixHQUFpQyxLQUFLM0IsV0FBTCxDQUFpQmUsQ0FBakIsQ0FBakM7QUFFSDtBQUNKOzs7OztrQkFuSGdCeEIsaUIiLCJmaWxlIjoiYW1iaS1iaW5hdXJhbERlY29kZXIyRGFzeW0yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBBcmNob250aXMgUG9saXRpc1xuLy8gIGFyY2hvbnRpcy5wb2xpdGlzQGFhbHRvLmZpXG4vLyAgRGF2aWQgUG9pcmllci1RdWlub3Rcbi8vICBkYXZpcG9pckBpcmNhbS5mclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vXG4vLyAgSlNBbWJpc29uaWNzIGEgSmF2YVNjcmlwdCBsaWJyYXJ5IGZvciBoaWdoZXItb3JkZXIgQW1iaXNvbmljc1xuLy8gIFRoZSBsaWJyYXJ5IGltcGxlbWVudHMgV2ViIEF1ZGlvIGJsb2NrcyB0aGF0IHBlcmZvcm1cbi8vICB0eXBpY2FsIGFtYmlzb25pYyBwcm9jZXNzaW5nIG9wZXJhdGlvbnMgb24gYXVkaW8gc2lnbmFscy5cbi8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vXG4vLyAgYmluRGVjb2RlciBmb3IgMkQgdXNlXG4vLyAgYWRhcHRlZCBieSBUaG9tYXMgRGVwcGlzY2hcbi8vICB0aG9tYXMuZGVwcGlzY2g5M0BnbWFpbC5jb21cbi8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vXG4vLyAgYmluRGVjb2RlciBmb3IgMkQgdXNpbmcgYXN5eW1ldHJpY2FsIGZpbHRlcnMgZm9yIHJvb20gbW9kZWxsaW5nXG4vLyAgYWRhcHRlZCBieSBCcnVjZSBXaWdnaW5zICYgTWFyayBEcmluZ1xuLy8gIGIuai53aWdnaW5zQGRlcmJ5LmFjLnVrXG4vLyAgbS5kcmluZ0BkZXJieS5hYy51a1xuLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLyogSE9BIEJJTkFVUkFMIERFQ09ERVIgMkQgQXltbWV0cmljIEZpbHRlcnMgKi9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8vIE5PVEUgVEhBVCBDVVJSRU5UIExJTUlUIElTIDE1dGggT1JERVJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIGJpbkRlY29kZXIyRGFzeW0yIHtcblxuICAgIGNvbnN0cnVjdG9yKGF1ZGlvQ3R4LCBvcmRlcikge1xuXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICAgICAgICB0aGlzLmN0eCA9IGF1ZGlvQ3R4OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0F1ZGlvIENvbnRleHRcbiAgICAgICAgdGhpcy5vcmRlciA9IG9yZGVyOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9XaGF0J3MgdGhlIG9yZGVyP1xuICAgICAgICB0aGlzLm5DaCA9IDIqb3JkZXIgKyAxOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIG9mIGNpcmN1bGFyIGhhcm1vbmljc1xuICAgICAgICAvL3RoaXMuZGVjRmlsdGVycyA9IG5ldyBBcnJheSh0aGlzLm5DaCk7ICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIG9mIGZpbHRlcnMgKHdpbGwgYmUgZG91YmxlIGZvciBhc3ltXG4gICAgICAgIC8vdGhpcy5kZWNGaWx0ZXJOb2RlcyA9IG5ldyBBcnJheSh0aGlzLm5DaCk7ICAgICAgICAgICAgIC8vIG5vIG9mIGZpbHRlciBub2RlcyAod2lsbCBiZSBkb3VibGUgZm9yIGFzeW0pXG4gICAgICAgIC8vIFdJRyBFRElUXG4gICAgICAgIHRoaXMuZGVjRmlsdGVyc0wgPSBuZXcgQXJyYXkodGhpcy5uQ2gpOyAvLyBubyBvZiBmaWx0ZXJzICh3aWxsIGJlIGRvdWJsZSBmb3IgYXN5bVxuICAgICAgICB0aGlzLmRlY0ZpbHRlck5vZGVzTCA9IG5ldyBBcnJheSh0aGlzLm5DaCk7IC8vIG5vIG9mIGZpbHRlciBub2RlcyAod2lsbCBiZSBkb3VibGUgZm9yIGFzeW0pXG4gICAgICAgIHRoaXMuZGVjRmlsdGVyc1IgPSBuZXcgQXJyYXkodGhpcy5uQ2gpOyAvLyBubyBvZiBmaWx0ZXJzICh3aWxsIGJlIGRvdWJsZSBmb3IgYXN5bVxuICAgICAgICB0aGlzLmRlY0ZpbHRlck5vZGVzUiA9IG5ldyBBcnJheSh0aGlzLm5DaCk7IC8vIG5vIG9mIGZpbHRlciBub2RlcyAod2lsbCBiZSBkb3VibGUgZm9yIGFzeW0pXG4gICAgICAgIC8vIEVORCBvZiBFRElUXG4gICAgICAgIFxuICAgICAgICAvLyBpbnB1dCBhbmQgb3V0cHV0IG5vZGVzXG4gICAgICAgIC8vIFdJRyBFRElUXG4gICAgICAgIHRoaXMuaW5MID0gdGhpcy5jdHguY3JlYXRlQ2hhbm5lbFNwbGl0dGVyKHRoaXMubkNoKTsgLy8gc3BsaXQgaW5wdXQgaW50byBuY2hhbm5lbHMgKG5vdCBzdXJlIGlmIG5lZWRzIGNoYW5naW5nKVxuICAgICAgICB0aGlzLmluUiA9IHRoaXMuY3R4LmNyZWF0ZUNoYW5uZWxTcGxpdHRlcih0aGlzLm5DaCk7XG4gICAgICAgIC8vIEVORCBvZiBFRElUXG4gICAgICAgIHRoaXMub3V0ID0gdGhpcy5jdHguY3JlYXRlQ2hhbm5lbE1lcmdlcigyKTsgICAgICAgICAgIC8vIG91dHB1dCBub2RlIG1lcmdlcyBiYWNrIGluIHRvIDIgY2hhbm5lbHNcbiAgICAgICAgdGhpcy5vdXQuY2hhbm5lbENvdW50TW9kZSA9ICdleHBsaWNpdCc7XG4gICAgICAgIHRoaXMub3V0LmNoYW5uZWxDb3VudCA9IDE7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwcm9iYWJseSBuZWVkcyB0byBiZSAyIGZvciBhc3ltPz8/P1xuICAgICAgICAvLyBkb3dubWl4aW5nIGdhaW5zIGZvciBsZWZ0IGFuZCByaWdodCBlYXJzXG4gICAgICAgIHRoaXMuZ2Fpbk1pZCA9IHRoaXMuY3R4LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5nYWluU2lkZSA9IHRoaXMuY3R4LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5pbnZlcnRTaWRlID0gdGhpcy5jdHguY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmdhaW5NaWQuZ2Fpbi52YWx1ZSA9IDE7XG4gICAgICAgIHRoaXMuZ2FpblNpZGUuZ2Fpbi52YWx1ZSA9IDE7XG4gICAgICAgIHRoaXMuaW52ZXJ0U2lkZS5nYWluLnZhbHVlID0gLTE7XG4gICAgICAgIC8vIGNvbnZvbHZlciBub2Rlc1xuICAgICAgICBcbiAgICAgICAgLy8gV0lHIEVESVQgZG91YmxlIHRoZSBudW1iZXIgb2YgZmlsdGVyc1xuICAgICAgICAvL2ZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5uQ2g7IGkrKykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubkNoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyTm9kZXNMW2ldID0gdGhpcy5jdHguY3JlYXRlQ29udm9sdmVyKCk7XG4gICAgICAgICAgICB0aGlzLmRlY0ZpbHRlck5vZGVzTFtpXS5ub3JtYWxpemUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyTm9kZXNSW2ldID0gdGhpcy5jdHguY3JlYXRlQ29udm9sdmVyKCk7XG4gICAgICAgICAgICB0aGlzLmRlY0ZpbHRlck5vZGVzUltpXS5ub3JtYWxpemUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBFTkQgb2YgRURJVFxuICAgICAgICBcbiAgICAgICAgLy8gaW5pdGlhbGl6ZSBjb252b2x2ZXJzIHRvIHBsYWluIGNhcmRpb2lkc1xuICAgICAgICB0aGlzLnJlc2V0RmlsdGVycygpO1xuICAgICAgICAvLyBjcmVhdGUgYXVkaW8gY29ubmVjdGlvbnNcbiAgICAgICAgLy8gV0lHIEVESVRcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm5DaDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmluTC5jb25uZWN0KHRoaXMuZGVjRmlsdGVyTm9kZXNMW2ldLCBpLCAwKTtcbiAgICAgICAgICAgIHRoaXMuaW5SLmNvbm5lY3QodGhpcy5kZWNGaWx0ZXJOb2Rlc1JbaV0sIGksIDApOyAvLyBjb25uZWN0IGNoYW5uZWwgaSBvZiBpbnB1dCB0byBjaGFubmVsIGkrbkNoIFxuICAgICAgICAgICAgLy8gb2YgZmlsdGVyTm9kZVxuICAgICAgICAgICAgdGhpcy5kZWNGaWx0ZXJOb2Rlc0xbaV0uY29ubmVjdCh0aGlzLm91dCwgMCwgMCk7IC8vIHNlbmQgY2ggMCBvZiBmaWx0ZXIgdG8gTGVmdCBvZiBvdXRwdXRcbiAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyTm9kZXNSW2ldLmNvbm5lY3QodGhpcy5vdXQsIDAsIDEpOyAvLyBzZW5kIGNoIDAgb2YgZmlsdGVyIHRvIFJpZ2h0IG9mIG91dHB1dFxuXG4gICAgICAgICAgLy9pZiAoKGklMikgPT0gMCkgdGhpcy5kZWNGaWx0ZXJOb2Rlc1tpXS5jb25uZWN0KHRoaXMuZ2Fpbk1pZCk7IC8vZXZlbiBudW1iZXJzIHRvIG1pZCBzaWduYWxcbiAgICAgICAgICAvL2Vsc2UgdGhpcy5kZWNGaWx0ZXJOb2Rlc1tpXS5jb25uZWN0KHRoaXMuZ2FpblNpZGUpOyAvL29kZCBudW1iZXJzIHRvIHNpZGUgc2lnbmFsXG4gICAgICAgIH1cbiAgICAgICAgLy90aGlzLmdhaW5NaWQuY29ubmVjdCh0aGlzLm91dCwgMCwgMCk7XG4gICAgICAgIC8vdGhpcy5nYWluU2lkZS5jb25uZWN0KHRoaXMub3V0LCAwLCAwKTtcblxuICAgICAgICAvL3RoaXMuZ2Fpbk1pZC5jb25uZWN0KHRoaXMub3V0LCAwLCAxKTtcbiAgICAgICAgLy90aGlzLmdhaW5TaWRlLmNvbm5lY3QodGhpcy5pbnZlcnRTaWRlLCAwLCAwKTtcbiAgICAgICAgLy90aGlzLmludmVydFNpZGUuY29ubmVjdCh0aGlzLm91dCwgMCwgMSk7XG4gICAgICAgIC8vIEVORCBvZiBFRElUXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHVwZGF0ZUZpbHRlcnMoYXVkaW9CdWZmZXJMLGF1ZGlvQnVmZmVyUikge1xuICAgICAgICAvLyBhc3NpZ24gZmlsdGVycyB0byBjb252b2x2ZXJzXG4gICAgICAgIC8vV0lHIEVESVQgd2Ugbm93IHNob3VsZCBoYXZlIHR3aWNlIHRoZSBudW1iZXIgb2YgZmlsdGVycyB1c2luZyB0d28gc2VwYXJhdGUgZmlsdGVyIGJhbmtzXG4gICAgICAgIC8vZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm5DaDsgaSsrKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5uQ2g7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyc0xbaV0gPSB0aGlzLmN0eC5jcmVhdGVCdWZmZXIoMSwgYXVkaW9CdWZmZXJMLmxlbmd0aCwgYXVkaW9CdWZmZXJMLnNhbXBsZVJhdGUpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyc0xbaV0uZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGF1ZGlvQnVmZmVyTC5nZXRDaGFubmVsRGF0YShpKSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmRlY0ZpbHRlcnNSW2ldID0gdGhpcy5jdHguY3JlYXRlQnVmZmVyKDEsIGF1ZGlvQnVmZmVyUi5sZW5ndGgsIGF1ZGlvQnVmZmVyUi5zYW1wbGVSYXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRlY0ZpbHRlcnNSW2ldLmdldENoYW5uZWxEYXRhKDApLnNldChhdWRpb0J1ZmZlclIuZ2V0Q2hhbm5lbERhdGEoaSkpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5kZWNGaWx0ZXJOb2Rlc0xbaV0uYnVmZmVyID0gdGhpcy5kZWNGaWx0ZXJzTFtpXTtcbiAgICAgICAgICAgICAgICB0aGlzLmRlY0ZpbHRlck5vZGVzUltpXS5idWZmZXIgPSB0aGlzLmRlY0ZpbHRlcnNSW2ldO1xuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldEZpbHRlcnMoKSB7XG4gICAgICAgIC8vIG92ZXJ3cml0ZSBkZWNvZGluZyBmaWx0ZXJzIChwbGFpbiBjYXJkaW9pZCB2aXJ0dWFsIG1pY3JvcGhvbmVzKVxuICAgICAgICB2YXIgY2FyZEdhaW5zID0gbmV3IEFycmF5KHRoaXMubkNoKTtcbiAgICAgICAgY2FyZEdhaW5zLmZpbGwoMCk7XG4gICAgICAgIGNhcmRHYWluc1swXSA9IDAuNTtcbiAgICAgICAgY2FyZEdhaW5zWzFdID0gMC41IC8gTWF0aC5zcXJ0KDMpO1xuICAgICAgICAvL1dJRyBFRElUIHNob3VsZCBoYXZlIGRvdWJsZSB0aGUgbnVtYmVyIG9mIGZpbHRlcnMgbm93XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5uQ2g7IGkrKykge1xuICAgICAgICAvL2ZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5uQ2g7IGkrKykge1xuICAgICAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgICAgICAvLyBUaGlzIHdvcmtzIGZvciBDaHJvbWUgYW5kIEZpcmVmb3g6XG4gICAgICAgICAgICAvLyB0aGlzLmRlY0ZpbHRlcnNbaV0gPSB0aGlzLmN0eC5jcmVhdGVCdWZmZXIoMSwgMSwgdGhpcy5jdHguc2FtcGxlUmF0ZSk7XG4gICAgICAgICAgICAvLyB0aGlzLmRlY0ZpbHRlcnNbaV0uZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KFtjYXJkR2FpbnNbaV1dKTtcbiAgICAgICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAgICAgLy8gU2FmYXJpIGZvcmNlcyB1cyB0byB1c2UgdGhpczpcbiAgICAgICAgICAgICAgICB0aGlzLmRlY0ZpbHRlcnNMW2ldID0gdGhpcy5jdHguY3JlYXRlQnVmZmVyKDEsIDY0LCB0aGlzLmN0eC5zYW1wbGVSYXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRlY0ZpbHRlcnNSW2ldID0gdGhpcy5jdHguY3JlYXRlQnVmZmVyKDEsIDY0LCB0aGlzLmN0eC5zYW1wbGVSYXRlKTtcbiAgICAgICAgICAgIC8vIGFuZCB3aWxsIHNlbmQgZ29yZ2VvdXMgY3JhbmNreSBub2lzZSBidXJzdHMgZm9yIGFueSB2YWx1ZSBiZWxvdyA2NFxuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCA2NDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyc0xbaV0uZ2V0Q2hhbm5lbERhdGEoMClbal0gPSAwLjA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyc1JbaV0uZ2V0Q2hhbm5lbERhdGEoMClbal0gPSAwLjA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmRlY0ZpbHRlcnNMW2ldLmdldENoYW5uZWxEYXRhKDApWzBdID0gY2FyZEdhaW5zW2ldO1xuICAgICAgICAgICAgdGhpcy5kZWNGaWx0ZXJzUltpXS5nZXRDaGFubmVsRGF0YSgwKVswXSA9IGNhcmRHYWluc1tpXTtcbiAgICAgICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAgICAgdGhpcy5kZWNGaWx0ZXJOb2Rlc0xbaV0uYnVmZmVyID0gdGhpcy5kZWNGaWx0ZXJzTFtpXTtcbiAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyTm9kZXNSW2ldLmJ1ZmZlciA9IHRoaXMuZGVjRmlsdGVyc1JbaV07XG5cbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==