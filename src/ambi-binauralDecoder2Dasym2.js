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
export default class binDecoder2Dasym2 {

    constructor(audioCtx, order) {

        this.initialized = false;

        this.ctx = audioCtx;                                                    //Audio Context
        this.order = order;                                                     //What's the order?
        this.nCh = 2*order + 1;                                             // no of circular harmonics
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
        this.out = this.ctx.createChannelMerger(2);           // output node merges back in to 2 channels
        this.out.channelCountMode = 'explicit';
        this.out.channelCount = 1;                                      // probably needs to be 2 for asym????
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

    updateFilters(audioBufferL,audioBufferR) {
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

    resetFilters() {
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
}
