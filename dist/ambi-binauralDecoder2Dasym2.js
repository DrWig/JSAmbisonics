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
        this.out = this.ctx.createChannelMerger(2); // output node merges back in to 2 channels
        this.out.channelCountMode = 'explicit';
        this.out.channelCount = 1; // probably needs to be 2 for asym????
        //this.outR = this.ctx.createChannelMerger(2); // output node merges back in to 2 channels
        //this.outR.channelCountMode = 'explicit';
        //this.outR.channelCount = 1; // probably needs to be 2 for asym????
        // END of EDIT
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
            //WIG EDIT we now should have twice the number of filters
            //for (var i = 0; i < this.nCh; i++) {
            for (var i = 0; i < this.nCh/* * 2*/; i++) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFtYmktYmluYXVyYWxEZWNvZGVyMkRhc3ltLmpzIl0sIm5hbWVzIjpbImJpbkRlY29kZXIyRGFzeW0iLCJhdWRpb0N0eCIsIm9yZGVyIiwiaW5pdGlhbGl6ZWQiLCJjdHgiLCJuQ2giLCJkZWNGaWx0ZXJzIiwiQXJyYXkiLCJkZWNGaWx0ZXJOb2RlcyIsImluIiwiY3JlYXRlQ2hhbm5lbFNwbGl0dGVyIiwib3V0IiwiY3JlYXRlQ2hhbm5lbE1lcmdlciIsImNoYW5uZWxDb3VudE1vZGUiLCJjaGFubmVsQ291bnQiLCJnYWluTWlkIiwiY3JlYXRlR2FpbiIsImdhaW5TaWRlIiwiaW52ZXJ0U2lkZSIsImdhaW4iLCJ2YWx1ZSIsImkiLCJjcmVhdGVDb252b2x2ZXIiLCJub3JtYWxpemUiLCJyZXNldEZpbHRlcnMiLCJjb25uZWN0IiwiYXVkaW9CdWZmZXIiLCJjcmVhdGVCdWZmZXIiLCJsZW5ndGgiLCJzYW1wbGVSYXRlIiwiZ2V0Q2hhbm5lbERhdGEiLCJzZXQiLCJidWZmZXIiLCJjYXJkR2FpbnMiLCJmaWxsIiwiTWF0aCIsInNxcnQiLCJqIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0lBQ3FCQSxnQjtBQUVqQiw4QkFBWUMsUUFBWixFQUFzQkMsS0FBdEIsRUFBNkI7QUFBQTs7O0FBRXpCLGFBQUtDLFdBQUwsR0FBbUIsS0FBbkI7O0FBRUEsYUFBS0MsR0FBTCxHQUFXSCxRQUFYLENBSnlCLENBSStDO0FBQ3hFLGFBQUtDLEtBQUwsR0FBYUEsS0FBYixDQUx5QixDQUsrQztBQUN4RSxhQUFLRyxHQUFMLEdBQVcsSUFBRUgsS0FBRixHQUFVLENBQXJCLENBTnlCLENB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QUtiLGNBQUwsQ0FBb0JhLENBQXBCLEVBQXVCVyxNQUF2QixHQUFnQyxLQUFLMUIsVUFBTCxDQUFnQmUsQ0FBaEIsQ0FBaEM7QUFDSDtBQUNKOzs7OztrQkFqR2dCckIsZ0IiLCJmaWxlIjoiYW1iaS1iaW5hdXJhbERlY29kZXIyRGFzeW0uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIEFyY2hvbnRpcyBQb2xpdGlzXG4vLyAgYXJjaG9udGlzLnBvbGl0aXNAYWFsdG8uZmlcbi8vICBEYXZpZCBQb2lyaWVyLVF1aW5vdFxuLy8gIGRhdmlwb2lyQGlyY2FtLmZyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy9cbi8vICBKU0FtYmlzb25pY3MgYSBKYXZhU2NyaXB0IGxpYnJhcnkgZm9yIGhpZ2hlci1vcmRlciBBbWJpc29uaWNzXG4vLyAgVGhlIGxpYnJhcnkgaW1wbGVtZW50cyBXZWIgQXVkaW8gYmxvY2tzIHRoYXQgcGVyZm9ybVxuLy8gIHR5cGljYWwgYW1iaXNvbmljIHByb2Nlc3Npbmcgb3BlcmF0aW9ucyBvbiBhdWRpbyBzaWduYWxzLlxuLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy9cbi8vICBiaW5EZWNvZGVyIGZvciAyRCB1c2Vcbi8vICBhZGFwdGVkIGJ5IFRob21hcyBEZXBwaXNjaFxuLy8gIHRob21hcy5kZXBwaXNjaDkzQGdtYWlsLmNvbVxuLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy9cbi8vICBiaW5EZWNvZGVyIGZvciAyRCB1c2luZyBhc3l5bWV0cmljYWwgZmlsdGVycyBmb3Igcm9vbSBtb2RlbGxpbmdcbi8vICBhZGFwdGVkIGJ5IEJydWNlIFdpZ2dpbnMgJiBNYXJrIERyaW5nXG4vLyAgYi5qLndpZ2dpbnNAZGVyYnkuYWMudWtcbi8vICBtLmRyaW5nQGRlcmJ5LmFjLnVrXG4vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vKiBIT0EgQklOQVVSQUwgREVDT0RFUiAyRCBBeW1tZXRyaWMgRmlsdGVycyAqL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLy8gTk9URSBUSEFUIENVUlJFTlQgTElNSVQgSVMgN3RoIE9SREVSXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBiaW5EZWNvZGVyMkRhc3ltIHtcblxuICAgIGNvbnN0cnVjdG9yKGF1ZGlvQ3R4LCBvcmRlcikge1xuXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICAgICAgICB0aGlzLmN0eCA9IGF1ZGlvQ3R4OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0F1ZGlvIENvbnRleHRcbiAgICAgICAgdGhpcy5vcmRlciA9IG9yZGVyOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9XaGF0J3MgdGhlIG9yZGVyP1xuICAgICAgICB0aGlzLm5DaCA9IDIqb3JkZXIgKyAxOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIG9mIGNpcmN1bGFyIGhhcm1vbmljc1xuICAgICAgICAvL3RoaXMuZGVjRmlsdGVycyA9IG5ldyBBcnJheSh0aGlzLm5DaCk7ICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIG9mIGZpbHRlcnMgKHdpbGwgYmUgZG91YmxlIGZvciBhc3ltXG4gICAgICAgIC8vdGhpcy5kZWNGaWx0ZXJOb2RlcyA9IG5ldyBBcnJheSh0aGlzLm5DaCk7ICAgICAgICAgICAgIC8vIG5vIG9mIGZpbHRlciBub2RlcyAod2lsbCBiZSBkb3VibGUgZm9yIGFzeW0pXG4gICAgICAgIC8vIFdJRyBFRElUXG4gICAgICAgIHRoaXMuZGVjRmlsdGVycyA9IG5ldyBBcnJheSh0aGlzLm5DaCoyKTsgICAgICAgICAgICAgICAgICAgICAgLy8gbm8gb2YgZmlsdGVycyAod2lsbCBiZSBkb3VibGUgZm9yIGFzeW1cbiAgICAgICAgdGhpcy5kZWNGaWx0ZXJOb2RlcyA9IG5ldyBBcnJheSh0aGlzLm5DaCoyKTsgICAgICAgICAgICAgLy8gbm8gb2YgZmlsdGVyIG5vZGVzICh3aWxsIGJlIGRvdWJsZSBmb3IgYXN5bSlcbiAgICAgICAgLy8gRU5EIG9mIEVESVRcbiAgICAgICAgXG4gICAgICAgIC8vIGlucHV0IGFuZCBvdXRwdXQgbm9kZXNcbiAgICAgICAgdGhpcy5pbiA9IHRoaXMuY3R4LmNyZWF0ZUNoYW5uZWxTcGxpdHRlcih0aGlzLm5DaCk7ICAgLy8gc3BsaXQgaW5wdXQgaW50byBuY2hhbm5lbHMgKG5vdCBzdXJlIGlmIG5lZWRzIGNoYW5naW5nKVxuICAgICAgICB0aGlzLm91dCA9IHRoaXMuY3R4LmNyZWF0ZUNoYW5uZWxNZXJnZXIoMik7ICAgICAgICAgICAvLyBvdXRwdXQgbm9kZSBtZXJnZXMgYmFjayBpbiB0byAyIGNoYW5uZWxzXG4gICAgICAgIHRoaXMub3V0LmNoYW5uZWxDb3VudE1vZGUgPSAnZXhwbGljaXQnO1xuICAgICAgICB0aGlzLm91dC5jaGFubmVsQ291bnQgPSAxOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJvYmFibHkgbmVlZHMgdG8gYmUgMiBmb3IgYXN5bT8/Pz9cbiAgICAgICAgLy8gZG93bm1peGluZyBnYWlucyBmb3IgbGVmdCBhbmQgcmlnaHQgZWFyc1xuICAgICAgICB0aGlzLmdhaW5NaWQgPSB0aGlzLmN0eC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuZ2FpblNpZGUgPSB0aGlzLmN0eC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuaW52ZXJ0U2lkZSA9IHRoaXMuY3R4LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5nYWluTWlkLmdhaW4udmFsdWUgPSAxO1xuICAgICAgICB0aGlzLmdhaW5TaWRlLmdhaW4udmFsdWUgPSAxO1xuICAgICAgICB0aGlzLmludmVydFNpZGUuZ2Fpbi52YWx1ZSA9IC0xO1xuICAgICAgICAvLyBjb252b2x2ZXIgbm9kZXNcbiAgICAgICAgXG4gICAgICAgIC8vIFdJRyBFRElUIGRvdWJsZSB0aGUgbnVtYmVyIG9mIGZpbHRlcnNcbiAgICAgICAgLy9mb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubkNoOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5uQ2gqMjsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmRlY0ZpbHRlck5vZGVzW2ldID0gdGhpcy5jdHguY3JlYXRlQ29udm9sdmVyKCk7XG4gICAgICAgICAgICB0aGlzLmRlY0ZpbHRlck5vZGVzW2ldLm5vcm1hbGl6ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIEVORCBvZiBFRElUXG4gICAgICAgIFxuICAgICAgICAvLyBpbml0aWFsaXplIGNvbnZvbHZlcnMgdG8gcGxhaW4gY2FyZGlvaWRzXG4gICAgICAgIHRoaXMucmVzZXRGaWx0ZXJzKCk7XG4gICAgICAgIC8vIGNyZWF0ZSBhdWRpbyBjb25uZWN0aW9uc1xuICAgICAgICAvLyBXSUcgRURJVFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubkNoOyBpKyspIHtcbiAgICAgICAgICB0aGlzLmluLmNvbm5lY3QodGhpcy5kZWNGaWx0ZXJOb2Rlc1tpXSwgaSwgMCk7XG4gICAgICAgICAgdGhpcy5pbi5jb25uZWN0KHRoaXMuZGVjRmlsdGVyTm9kZXNbaSt0aGlzLm5DaF0saSwwKTsgICAgICAgICAgLy8gY29ubmVjdCBjaGFubmVsIGkgb2YgaW5wdXQgdG8gY2hhbm5lbCBpK25DaCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb2YgZmlsdGVyTm9kZVxuICAgICAgICAgIHRoaXMuZGVjRmlsdGVyTm9kZXNbaV0uY29ubmVjdCh0aGlzLm91dCwwLDApOyAgICAgICAgICAgICAvLyBzZW5kIGNoIDAgb2YgZmlsdGVyIHRvIExlZnQgb2Ygb3V0cHV0XG4gICAgICAgICAgdGhpcy5kZWNGaWx0ZXJOb2Rlc1tpK3RoaXMubkNoXS5jb25uZWN0KHRoaXMub3V0LDAsMSk7ICAgIC8vIHNlbmQgY2ggMCBvZiBmaWx0ZXIgdG8gUmlnaHQgb2Ygb3V0cHV0XG4gICAgICAgICAgLy9pZiAoKGklMikgPT0gMCkgdGhpcy5kZWNGaWx0ZXJOb2Rlc1tpXS5jb25uZWN0KHRoaXMuZ2Fpbk1pZCk7IC8vZXZlbiBudW1iZXJzIHRvIG1pZCBzaWduYWxcbiAgICAgICAgICAvL2Vsc2UgdGhpcy5kZWNGaWx0ZXJOb2Rlc1tpXS5jb25uZWN0KHRoaXMuZ2FpblNpZGUpOyAvL29kZCBudW1iZXJzIHRvIHNpZGUgc2lnbmFsXG4gICAgICAgIH1cbiAgICAgICAgLy90aGlzLmdhaW5NaWQuY29ubmVjdCh0aGlzLm91dCwgMCwgMCk7XG4gICAgICAgIC8vdGhpcy5nYWluU2lkZS5jb25uZWN0KHRoaXMub3V0LCAwLCAwKTtcblxuICAgICAgICAvL3RoaXMuZ2Fpbk1pZC5jb25uZWN0KHRoaXMub3V0LCAwLCAxKTtcbiAgICAgICAgLy90aGlzLmdhaW5TaWRlLmNvbm5lY3QodGhpcy5pbnZlcnRTaWRlLCAwLCAwKTtcbiAgICAgICAgLy90aGlzLmludmVydFNpZGUuY29ubmVjdCh0aGlzLm91dCwgMCwgMSk7XG4gICAgICAgIC8vIEVORCBvZiBFRElUXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHVwZGF0ZUZpbHRlcnMoYXVkaW9CdWZmZXIpIHtcbiAgICAgICAgLy8gYXNzaWduIGZpbHRlcnMgdG8gY29udm9sdmVyc1xuICAgICAgICAvL1dJRyBFRElUIHdlIG5vdyBzaG91bGQgaGF2ZSB0d2ljZSB0aGUgbnVtYmVyIG9mIGZpbHRlcnNcbiAgICAgICAgLy9mb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubkNoOyBpKyspIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm5DaCoyOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyc1tpXSA9IHRoaXMuY3R4LmNyZWF0ZUJ1ZmZlcigxLCBhdWRpb0J1ZmZlci5sZW5ndGgsIGF1ZGlvQnVmZmVyLnNhbXBsZVJhdGUpO1xuICAgICAgICAgICAgdGhpcy5kZWNGaWx0ZXJzW2ldLmdldENoYW5uZWxEYXRhKDApLnNldChhdWRpb0J1ZmZlci5nZXRDaGFubmVsRGF0YShpKSk7XG5cbiAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyTm9kZXNbaV0uYnVmZmVyID0gdGhpcy5kZWNGaWx0ZXJzW2ldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXRGaWx0ZXJzKCkge1xuICAgICAgICAvLyBvdmVyd3JpdGUgZGVjb2RpbmcgZmlsdGVycyAocGxhaW4gY2FyZGlvaWQgdmlydHVhbCBtaWNyb3Bob25lcylcbiAgICAgICAgdmFyIGNhcmRHYWlucyA9IG5ldyBBcnJheSh0aGlzLm5DaCk7XG4gICAgICAgIGNhcmRHYWlucy5maWxsKDApO1xuICAgICAgICBjYXJkR2FpbnNbMF0gPSAwLjU7XG4gICAgICAgIGNhcmRHYWluc1sxXSA9IDAuNSAvIE1hdGguc3FydCgzKTtcbiAgICAgICAgLy9XSUcgRURJVCBzaG91bGQgaGF2ZSBkb3VibGUgdGhlIG51bWJlciBvZiBmaWx0ZXJzIG5vd1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubkNoKjI7IGkrKykge1xuICAgICAgICAvL2ZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5uQ2g7IGkrKykge1xuICAgICAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgICAgICAvLyBUaGlzIHdvcmtzIGZvciBDaHJvbWUgYW5kIEZpcmVmb3g6XG4gICAgICAgICAgICAvLyB0aGlzLmRlY0ZpbHRlcnNbaV0gPSB0aGlzLmN0eC5jcmVhdGVCdWZmZXIoMSwgMSwgdGhpcy5jdHguc2FtcGxlUmF0ZSk7XG4gICAgICAgICAgICAvLyB0aGlzLmRlY0ZpbHRlcnNbaV0uZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KFtjYXJkR2FpbnNbaV1dKTtcbiAgICAgICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAgICAgLy8gU2FmYXJpIGZvcmNlcyB1cyB0byB1c2UgdGhpczpcbiAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyc1tpXSA9IHRoaXMuY3R4LmNyZWF0ZUJ1ZmZlcigxLCA2NCwgdGhpcy5jdHguc2FtcGxlUmF0ZSk7XG4gICAgICAgICAgICAvLyBhbmQgd2lsbCBzZW5kIGdvcmdlb3VzIGNyYW5ja3kgbm9pc2UgYnVyc3RzIGZvciBhbnkgdmFsdWUgYmVsb3cgNjRcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgNjQ7IGorKykge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyc1tpXS5nZXRDaGFubmVsRGF0YSgwKVtqXSA9IDAuMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGVjRmlsdGVyc1tpXS5nZXRDaGFubmVsRGF0YSgwKVswXSA9IGNhcmRHYWluc1tpXTtcbiAgICAgICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAgICAgdGhpcy5kZWNGaWx0ZXJOb2Rlc1tpXS5idWZmZXIgPSB0aGlzLmRlY0ZpbHRlcnNbaV07XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=