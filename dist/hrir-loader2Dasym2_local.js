"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

////////////////////////////////////////////////////////////////////
//  Archontis Politis (Aalto University)
//  archontis.politis@aalto.fi
//  David Poirier-Quinot (IRCAM)
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
//  HRIRloader for 2D use
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
///////////////////
/* HRIR LOADER 2D Asymmetrical Filters*/
///////////////////

// NOTE THAT CURRENT LIMIT IS 15th ORDER

var utils = require("./utils.js");

var HRIRloader2Dasym2_local = function () {
    function HRIRloader2Dasym2_local(context, order, callback) {
        (0, _classCallCheck3.default)(this, HRIRloader2Dasym2_local);

        this.context = context;
        this.order = order;
        this.nCh = 2 * order + 1;
        // function called when filters loaded
        this.onLoad = callback;
        // define required virtual speaker positions based on Ambisonic order
        this.vls_dirs_deg = utils.sampleCircle(2 * this.order + 2); //2n+2 virtual speakers for 2D
        this.nVLS = this.vls_dirs_deg.length;
        // angular resolution for fast lookup to closest HRIR to a given direction
        this.nearestLookupRes = [2.5, 2.5];
    }

    (0, _createClass3.default)(HRIRloader2Dasym2_local, [{
        key: "load",
        value: function load(setUrl) {

            var self = this;
            // setup the request
            var requestHrir = new XMLHttpRequest();
            requestHrir.open("GET", setUrl, true);
            requestHrir.responseType = "json";
            requestHrir.onload = function () {
                // load useful HRIR stuff from JSON
                self.parseHrirFromJSON(requestHrir.response);
                // construct lookup table for fast closest HRIR finding
                self.nearestLookup = utils.createNearestLookup(self.hrir_dirs_deg, self.nearestLookupRes);
                // find closest indices to VLS
                var nearestIdx = utils.findNearest(self.vls_dirs_deg, self.nearestLookup, self.nearestLookupRes);
                // get closest HRIRs to the VLS design
                self.nearest_dirs_deg = self.getClosestDirs(nearestIdx, self.hrir_dirs_deg);
                self.vls_hrirs = self.getClosestHrirFilters(nearestIdx, self.hrirs);
                // compute ambisonic decoding filters
                self.computeDecFilters();
            };
            requestHrir.send(); // Send the Request and Load the File
        }
    }, {
        key: "parseHrirFromJSON",
        value: function parseHrirFromJSON(hrirSet) {
            var self = this;
            this.fs = hrirSet.leaves[6].data[0]; // samplerate of the set
            this.nHrirs = hrirSet.leaves[4].data.length; // number of HRIR measurements
            this.nSamples = hrirSet.leaves[8].data[0][1].length; // length of HRIRs
            // parse azimuth-elevation of HRIRs
            this.hrir_dirs_deg = [];
            hrirSet.leaves[4].data.forEach(function (element) {
                self.hrir_dirs_deg.push([element[0], element[1]]);
            });
            // parse HRIR buffers
            this.hrirs = [];
            hrirSet.leaves[8].data.forEach(function (element) {
                var left = new Float64Array(element[0]);
                var right = new Float64Array(element[1]);
                self.hrirs.push([left, right]);
            });
        }
    }, {
        key: "getClosestDirs",
        value: function getClosestDirs(nearestIdx, hrir_dirs_deg) {
            // getClosestHrirFilters(target_dirs_deg, hrir_dirs_deg, INFO) {
            var nDirs = nearestIdx.length;
            var nearest_dirs_deg = [];
            for (var i = 0; i < nDirs; i++) {
                // get available positions (in the HRIR set) nearest from the required speakers positions
                nearest_dirs_deg.push(hrir_dirs_deg[nearestIdx[i]]);
            }
            return nearest_dirs_deg;
            //        if (INFO) {
            //            // compare required vs. present positions in HRIR filter
            //            let angularDistDeg = 0;
            //            for (let i = 0; i < nDirs; i++) {
            //                if (this.target_dirs_deg[i][0] < 0) this.target_dirs_deg[i][0] += 360.0;
            //                angularDistDeg += Math.sqrt(
            //                                            Math.pow(this.target_dirs_deg[i][0] - grantedFilterPos[i][0], 2) +
            //                                            Math.pow(this.target_dirs_deg[i][1] - grantedFilterPos[i][1], 2));
            //                // console.log('asked / granted pos: ', this.wishedSpeakerPos[i], '/', grantedFilterPos[i]);
            //            }
            //            console.log('summed / average angular dist between target and actual pos:',
            //                        Math.round(angularDistDeg*100)/100, 'deg /',
            //                        Math.round( (angularDistDeg/this.wishedSpeakerPos.length) *100)/100, 'deg');
            //        }
        }
    }, {
        key: "getClosestHrirFilters",
        value: function getClosestHrirFilters(nearestIdx, hrirs) {

            var nDirs = nearestIdx.length;
            var nearest_hrirs = [];
            for (var i = 0; i < nDirs; i++) {
                // get respective hrirs
                nearest_hrirs.push(hrirs[nearestIdx[i]]);
            }
            return nearest_hrirs;
        }
    }, {
        key: "computeDecFilters",
        value: function computeDecFilters() {

            // max rE optimization
            var a_n = [];
            a_n.push(1);
            for (var i = 1; i < this.order + 1; i++) {
                a_n.push(Math.cos(i * Math.PI / (2 * this.order + 2)));
                a_n.push(Math.cos(i * Math.PI / (2 * this.order + 2)));
            }
            var diagA = numeric.diag(a_n);
            // get decoding matrix
            this.decodingMatrix = numeric.transpose(utils.getCircHarmonics(this.order, utils.getColumn(this.vls_dirs_deg, 0)));
            this.decodingMatrix = numeric.dot(this.decodingMatrix, diagA);
            // normalise to number of speakers
            this.decodingMatrix = numeric.mul(2 * Math.PI / this.vls_dirs_deg.length, this.decodingMatrix);
            // convert hrir filters to hoa filters
            this.hoaBufferL = this.getHoaFilterFromHrirFilterL(this.nCh, this.nSamples, this.fs, this.vls_hrirs, this.decodingMatrix);
            this.hoaBufferR = this.getHoaFilterFromHrirFilterR(this.nCh, this.nSamples, this.fs, this.vls_hrirs, this.decodingMatrix);
            // pass resulting hoa filters to user callback NEED TO CHANGE THIS IN THE PAGE JS!!!
            // load filters and assign to buffers
            //var assignFiltersOnLoad = function(bufferL,bufferR) {
            //console.log('successfully loaded HOA buffer:', buffer);
            //decoder.updateFilters(bufferL,bufferR);
            //}
            //var loader_filters = new ambisonics.HRIRloader2D_local(context, maxOrder assignFiltersOnLoad);
            //loader_filters.load(irUrl_0);

            this.onLoad(this.hoaBufferL, this.hoaBufferR);
            //this.onLoad(this.hoaBufferR);
        }
    }, {
        key: "getHoaFilterFromHrirFilterL",
        value: function getHoaFilterFromHrirFilterL(nCh, nSamples, sampleRate, hrirs, decodingMatrix) {
            // create empty buffer ready to receive hoa filters
            if (nSamples > hrirs[0][0].length) nSamples = hrirs[0][0].length;

            // WIG EDIT
            //let hoaBuffer = this.context.createBuffer(nCh, nSamples, sampleRate);
            var hoaBufferL = this.context.createBuffer(nCh, nSamples, sampleRate);
            // END of EDIT

            // sum weighted HRIR over Ambisonic channels to create HOA IRs
            for (var i = 0; i < nCh; i++) {
                var concatBufferArrayLeft = new Float32Array(nSamples);
                for (var j = 0; j < hrirs.length; j++) {
                    for (var k = 0; k < nSamples; k++) {
                        concatBufferArrayLeft[k] += decodingMatrix[j][i] * hrirs[j][0][k];
                    }
                }
                hoaBufferL.getChannelData(i).set(concatBufferArrayLeft);
            }
            return hoaBufferL;
        }
    }, {
        key: "getHoaFilterFromHrirFilterR",
        value: function getHoaFilterFromHrirFilterR(nCh, nSamples, sampleRate, hrirs, decodingMatrix) {
            // create empty buffer ready to receive hoa filters
            if (nSamples > hrirs[0][0].length) nSamples = hrirs[0][0].length;
            var hoaBufferR = this.context.createBuffer(nCh, nSamples, sampleRate);

            // sum weighted HRIR over Ambisonic channels to create HOA IRs
            for (var i = 0; i < nCh; i++) {
                var concatBufferArrayRight = new Float32Array(nSamples);
                for (var j = 0; j < hrirs.length; j++) {
                    for (var k = 0; k < nSamples; k++) {
                        concatBufferArrayRight[k] += decodingMatrix[j][i] * hrirs[j][1][k];
                    }
                }
                hoaBufferR.getChannelData(i).set(concatBufferArrayRight);
            }
            return hoaBufferR;
        }
    }]);
    return HRIRloader2Dasym2_local;
}();

exports.default = HRIRloader2Dasym2_local;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhyaXItbG9hZGVyMkRhc3ltMl9sb2NhbC5qcyJdLCJuYW1lcyI6WyJ1dGlscyIsInJlcXVpcmUiLCJIUklSbG9hZGVyMkRhc3ltMl9sb2NhbCIsImNvbnRleHQiLCJvcmRlciIsImNhbGxiYWNrIiwibkNoIiwib25Mb2FkIiwidmxzX2RpcnNfZGVnIiwic2FtcGxlQ2lyY2xlIiwiblZMUyIsImxlbmd0aCIsIm5lYXJlc3RMb29rdXBSZXMiLCJzZXRVcmwiLCJzZWxmIiwicmVxdWVzdEhyaXIiLCJYTUxIdHRwUmVxdWVzdCIsIm9wZW4iLCJyZXNwb25zZVR5cGUiLCJvbmxvYWQiLCJwYXJzZUhyaXJGcm9tSlNPTiIsInJlc3BvbnNlIiwibmVhcmVzdExvb2t1cCIsImNyZWF0ZU5lYXJlc3RMb29rdXAiLCJocmlyX2RpcnNfZGVnIiwibmVhcmVzdElkeCIsImZpbmROZWFyZXN0IiwibmVhcmVzdF9kaXJzX2RlZyIsImdldENsb3Nlc3REaXJzIiwidmxzX2hyaXJzIiwiZ2V0Q2xvc2VzdEhyaXJGaWx0ZXJzIiwiaHJpcnMiLCJjb21wdXRlRGVjRmlsdGVycyIsInNlbmQiLCJocmlyU2V0IiwiZnMiLCJsZWF2ZXMiLCJkYXRhIiwibkhyaXJzIiwiblNhbXBsZXMiLCJmb3JFYWNoIiwiZWxlbWVudCIsInB1c2giLCJsZWZ0IiwiRmxvYXQ2NEFycmF5IiwicmlnaHQiLCJuRGlycyIsImkiLCJuZWFyZXN0X2hyaXJzIiwiYV9uIiwiTWF0aCIsImNvcyIsIlBJIiwiZGlhZ0EiLCJudW1lcmljIiwiZGlhZyIsImRlY29kaW5nTWF0cml4IiwidHJhbnNwb3NlIiwiZ2V0Q2lyY0hhcm1vbmljcyIsImdldENvbHVtbiIsImRvdCIsIm11bCIsImhvYUJ1ZmZlckwiLCJnZXRIb2FGaWx0ZXJGcm9tSHJpckZpbHRlckwiLCJob2FCdWZmZXJSIiwiZ2V0SG9hRmlsdGVyRnJvbUhyaXJGaWx0ZXJSIiwic2FtcGxlUmF0ZSIsImNyZWF0ZUJ1ZmZlciIsImNvbmNhdEJ1ZmZlckFycmF5TGVmdCIsIkZsb2F0MzJBcnJheSIsImoiLCJrIiwiZ2V0Q2hhbm5lbERhdGEiLCJzZXQiLCJjb25jYXRCdWZmZXJBcnJheVJpZ2h0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBLElBQUlBLFFBQVFDLFFBQVEsWUFBUixDQUFaOztJQUVxQkMsdUI7QUFDakIscUNBQVlDLE9BQVosRUFBcUJDLEtBQXJCLEVBQTRCQyxRQUE1QixFQUFzQztBQUFBOztBQUNsQyxhQUFLRixPQUFMLEdBQWVBLE9BQWY7QUFDQSxhQUFLQyxLQUFMLEdBQWFBLEtBQWI7QUFDQSxhQUFLRSxHQUFMLEdBQVcsSUFBRUYsS0FBRixHQUFVLENBQXJCO0FBQ0E7QUFDQSxhQUFLRyxNQUFMLEdBQWNGLFFBQWQ7QUFDQTtBQUNBLGFBQUtHLFlBQUwsR0FBb0JSLE1BQU1TLFlBQU4sQ0FBbUIsSUFBRSxLQUFLTCxLQUFQLEdBQWUsQ0FBbEMsQ0FBcEIsQ0FQa0MsQ0FPd0I7QUFDMUQsYUFBS00sSUFBTCxHQUFZLEtBQUtGLFlBQUwsQ0FBa0JHLE1BQTlCO0FBQ0E7QUFDQSxhQUFLQyxnQkFBTCxHQUF3QixDQUFDLEdBQUQsRUFBSyxHQUFMLENBQXhCO0FBQ0g7Ozs7NkJBRUlDLE0sRUFBUTs7QUFFVCxnQkFBSUMsT0FBTyxJQUFYO0FBQ0E7QUFDQSxnQkFBSUMsY0FBYyxJQUFJQyxjQUFKLEVBQWxCO0FBQ0FELHdCQUFZRSxJQUFaLENBQWlCLEtBQWpCLEVBQXdCSixNQUF4QixFQUFnQyxJQUFoQztBQUNBRSx3QkFBWUcsWUFBWixHQUEyQixNQUEzQjtBQUNBSCx3QkFBWUksTUFBWixHQUFxQixZQUFXO0FBQzVCO0FBQ0FMLHFCQUFL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QUFDRFQsMkJBQVdVLGNBQVgsQ0FBMEJ6QixDQUExQixFQUE2QjBCLEdBQTdCLENBQWlDTCxxQkFBakM7QUFDSDtBQUNELG1CQUFPTixVQUFQO0FBQ0g7OztvREFFMkJ4RCxHLEVBQUtpQyxRLEVBQVUyQixVLEVBQVluQyxLLEVBQU95QixjLEVBQWdCO0FBQzFFO0FBQ0EsZ0JBQUlqQixXQUFTUixNQUFNLENBQU4sRUFBUyxDQUFULEVBQVlwQixNQUF6QixFQUFpQzRCLFdBQVdSLE1BQU0sQ0FBTixFQUFTLENBQVQsRUFBWXBCLE1BQXZCO0FBQ2pDLGdCQUFJcUQsYUFBYSxLQUFLN0QsT0FBTCxDQUFhZ0UsWUFBYixDQUEwQjdELEdBQTFCLEVBQStCaUMsUUFBL0IsRUFBeUMyQixVQUF6QyxDQUFqQjs7QUFFQTtBQUNBLGlCQUFLLElBQUluQixJQUFJLENBQWIsRUFBZ0JBLElBQUl6QyxHQUFwQixFQUF5QnlDLEdBQXpCLEVBQThCO0FBQzFCLG9CQUFJMkIseUJBQXlCLElBQUlMLFlBQUosQ0FBaUI5QixRQUFqQixDQUE3QjtBQUNBLHFCQUFLLElBQUkrQixJQUFJLENBQWIsRUFBZ0JBLElBQUl2QyxNQUFNcEIsTUFBMUIsRUFBa0MyRCxHQUFsQyxFQUF1QztBQUNuQyx5QkFBSyxJQUFJQyxJQUFJLENBQWIsRUFBZ0JBLElBQUloQyxRQUFwQixFQUE4QmdDLEdBQTlCLEVBQW1DO0FBQy9CRywrQ0FBdUJILENBQXZCLEtBQTZCZixlQUFlYyxDQUFmLEVBQWtCdkIsQ0FBbEIsSUFBdUJoQixNQUFNdUMsQ0FBTixFQUFTLENBQVQsRUFBWUMsQ0FBWixDQUFwRDtBQUNIO0FBQ0o7QUFDRFAsMkJBQVdRLGNBQVgsQ0FBMEJ6QixDQUExQixFQUE2QjBCLEdBQTdCLENBQWlDQyxzQkFBakM7QUFDSDtBQUNELG1CQUFPVixVQUFQO0FBQ0g7Ozs7O2tCQWpLZ0I5RCx1QiIsImZpbGUiOiJocmlyLWxvYWRlcjJEYXN5bTJfbG9jYWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIEFyY2hvbnRpcyBQb2xpdGlzIChBYWx0byBVbml2ZXJzaXR5KVxuLy8gIGFyY2hvbnRpcy5wb2xpdGlzQGFhbHRvLmZpXG4vLyAgRGF2aWQgUG9pcmllci1RdWlub3QgKElSQ0FNKVxuLy8gIGRhdmlwb2lyQGlyY2FtLmZyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy9cbi8vICBKU0FtYmlzb25pY3MgYSBKYXZhU2NyaXB0IGxpYnJhcnkgZm9yIGhpZ2hlci1vcmRlciBBbWJpc29uaWNzXG4vLyAgVGhlIGxpYnJhcnkgaW1wbGVtZW50cyBXZWIgQXVkaW8gYmxvY2tzIHRoYXQgcGVyZm9ybVxuLy8gIHR5cGljYWwgYW1iaXNvbmljIHByb2Nlc3Npbmcgb3BlcmF0aW9ucyBvbiBhdWRpbyBzaWduYWxzLlxuLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy9cbi8vICBIUklSbG9hZGVyIGZvciAyRCB1c2Vcbi8vICBhZGFwdGVkIGJ5IFRob21hcyBEZXBwaXNjaFxuLy8gIHRob21hcy5kZXBwaXNjaDkzQGdtYWlsLmNvbVxuLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy9cbi8vICBiaW5EZWNvZGVyIGZvciAyRCB1c2luZyBhc3l5bWV0cmljYWwgZmlsdGVycyBmb3Igcm9vbSBtb2RlbGxpbmdcbi8vICBhZGFwdGVkIGJ5IEJydWNlIFdpZ2dpbnMgJiBNYXJrIERyaW5nXG4vLyAgYi5qLndpZ2dpbnNAZGVyYnkuYWMudWtcbi8vICBtLmRyaW5nQGRlcmJ5LmFjLnVrXG4vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy9cbi8qIEhSSVIgTE9BREVSIDJEIEFzeW1tZXRyaWNhbCBGaWx0ZXJzKi9cbi8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLy8gTk9URSBUSEFUIENVUlJFTlQgTElNSVQgSVMgMTV0aCBPUkRFUlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlscy5qc1wiKTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSFJJUmxvYWRlcjJEYXN5bTJfbG9jYWwge1xuICAgIGNvbnN0cnVjdG9yKGNvbnRleHQsIG9yZGVyLCBjYWxsYmFjaykge1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLm9yZGVyID0gb3JkZXI7XG4gICAgICAgIHRoaXMubkNoID0gMipvcmRlciArIDE7XG4gICAgICAgIC8vIGZ1bmN0aW9uIGNhbGxlZCB3aGVuIGZpbHRlcnMgbG9hZGVkXG4gICAgICAgIHRoaXMub25Mb2FkID0gY2FsbGJhY2s7XG4gICAgICAgIC8vIGRlZmluZSByZXF1aXJlZCB2aXJ0dWFsIHNwZWFrZXIgcG9zaXRpb25zIGJhc2VkIG9uIEFtYmlzb25pYyBvcmRlclxuICAgICAgICB0aGlzLnZsc19kaXJzX2RlZyA9IHV0aWxzLnNhbXBsZUNpcmNsZSgyKnRoaXMub3JkZXIgKyAyKTsgLy8ybisyIHZpcnR1YWwgc3BlYWtlcnMgZm9yIDJEXG4gICAgICAgIHRoaXMublZMUyA9IHRoaXMudmxzX2RpcnNfZGVnLmxlbmd0aDtcbiAgICAgICAgLy8gYW5ndWxhciByZXNvbHV0aW9uIGZvciBmYXN0IGxvb2t1cCB0byBjbG9zZXN0IEhSSVIgdG8gYSBnaXZlbiBkaXJlY3Rpb25cbiAgICAgICAgdGhpcy5uZWFyZXN0TG9va3VwUmVzID0gWzIuNSwyLjVdO1xuICAgIH1cblxuICAgIGxvYWQoc2V0VXJsKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAvLyBzZXR1cCB0aGUgcmVxdWVzdFxuICAgICAgICB2YXIgcmVxdWVzdEhyaXIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgcmVxdWVzdEhyaXIub3BlbihcIkdFVFwiLCBzZXRVcmwsIHRydWUpO1xuICAgICAgICByZXF1ZXN0SHJpci5yZXNwb25zZVR5cGUgPSBcImpzb25cIjtcbiAgICAgICAgcmVxdWVzdEhyaXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBsb2FkIHVzZWZ1bCBIUklSIHN0dWZmIGZyb20gSlNPTlxuICAgICAgICAgICAgc2VsZi5wYXJzZUhyaXJGcm9tSlNPTihyZXF1ZXN0SHJpci5yZXNwb25zZSk7XG4gICAgICAgICAgICAvLyBjb25zdHJ1Y3QgbG9va3VwIHRhYmxlIGZvciBmYXN0IGNsb3Nlc3QgSFJJUiBmaW5kaW5nXG4gICAgICAgICAgICBzZWxmLm5lYXJlc3RMb29rdXAgPSB1dGlscy5jcmVhdGVOZWFyZXN0TG9va3VwKHNlbGYuaHJpcl9kaXJzX2RlZywgc2VsZi5uZWFyZXN0TG9va3VwUmVzKTtcbiAgICAgICAgICAgIC8vIGZpbmQgY2xvc2VzdCBpbmRpY2VzIHRvIFZMU1xuICAgICAgICAgICAgbGV0IG5lYXJlc3RJZHggPSB1dGlscy5maW5kTmVhcmVzdChzZWxmLnZsc19kaXJzX2RlZywgc2VsZi5uZWFyZXN0TG9va3VwLCBzZWxmLm5lYXJlc3RMb29rdXBSZXMpO1xuICAgICAgICAgICAgLy8gZ2V0IGNsb3Nlc3QgSFJJUnMgdG8gdGhlIFZMUyBkZXNpZ25cbiAgICAgICAgICAgIHNlbGYubmVhcmVzdF9kaXJzX2RlZyA9IHNlbGYuZ2V0Q2xvc2VzdERpcnMobmVhcmVzdElkeCwgc2VsZi5ocmlyX2RpcnNfZGVnKTtcbiAgICAgICAgICAgIHNlbGYudmxzX2hyaXJzID0gc2VsZi5nZXRDbG9zZXN0SHJpckZpbHRlcnMobmVhcmVzdElkeCwgc2VsZi5ocmlycyk7XG4gICAgICAgICAgICAvLyBjb21wdXRlIGFtYmlzb25pYyBkZWNvZGluZyBmaWx0ZXJzXG4gICAgICAgICAgICBzZWxmLmNvbXB1dGVEZWNGaWx0ZXJzKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWVzdEhyaXIuc2VuZCgpOyAvLyBTZW5kIHRoZSBSZXF1ZXN0IGFuZCBMb2FkIHRoZSBGaWxlXG4gICAgfVxuXG4gICAgcGFyc2VIcmlyRnJvbUpTT04oaHJpclNldCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuZnMgPSBocmlyU2V0LmxlYXZlc1s2XS5kYXRhWzBdOyAgICAgICAgICAgICAgICAgICAgLy8gc2FtcGxlcmF0ZSBvZiB0aGUgc2V0XG4gICAgICAgIHRoaXMubkhyaXJzID0gaHJpclNldC5sZWF2ZXNbNF0uZGF0YS5sZW5ndGg7ICAgICAgICAgICAgLy8gbnVtYmVyIG9mIEhSSVIgbWVhc3VyZW1lbnRzXG4gICAgICAgIHRoaXMublNhbXBsZXMgPSBocmlyU2V0LmxlYXZlc1s4XS5kYXRhWzBdWzFdLmxlbmd0aDsgICAgLy8gbGVuZ3RoIG9mIEhSSVJzXG4gICAgICAgIC8vIHBhcnNlIGF6aW11dGgtZWxldmF0aW9uIG9mIEhSSVJzXG4gICAgICAgIHRoaXMuaHJpcl9kaXJzX2RlZyA9IFtdO1xuICAgICAgICBocmlyU2V0LmxlYXZlc1s0XS5kYXRhLmZvckVhY2goZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5ocmlyX2RpcnNfZGVnLnB1c2goW2VsZW1lbnRbMF0sIGVsZW1lbnRbMV1dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAvLyBwYXJzZSBIUklSIGJ1ZmZlcnNcbiAgICAgICAgdGhpcy5ocmlycyA9IFtdO1xuICAgICAgICBocmlyU2V0LmxlYXZlc1s4XS5kYXRhLmZvckVhY2goZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxlZnQgPSBuZXcgRmxvYXQ2NEFycmF5KGVsZW1lbnRbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJpZ2h0ID0gbmV3IEZsb2F0NjRBcnJheShlbGVtZW50WzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuaHJpcnMucHVzaChbbGVmdCwgcmlnaHRdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgZ2V0Q2xvc2VzdERpcnMobmVhcmVzdElkeCwgaHJpcl9kaXJzX2RlZykge1xuICAgIC8vIGdldENsb3Nlc3RIcmlyRmlsdGVycyh0YXJnZXRfZGlyc19kZWcsIGhyaXJfZGlyc19kZWcsIElORk8pIHtcbiAgICAgICAgdmFyIG5EaXJzID0gbmVhcmVzdElkeC5sZW5ndGg7XG4gICAgICAgIHZhciBuZWFyZXN0X2RpcnNfZGVnID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbkRpcnM7IGkrKykge1xuICAgICAgICAgICAgLy8gZ2V0IGF2YWlsYWJsZSBwb3NpdGlvbnMgKGluIHRoZSBIUklSIHNldCkgbmVhcmVzdCBmcm9tIHRoZSByZXF1aXJlZCBzcGVha2VycyBwb3NpdGlvbnNcbiAgICAgICAgICAgIG5lYXJlc3RfZGlyc19kZWcucHVzaChocmlyX2RpcnNfZGVnW25lYXJlc3RJZHhbaV1dKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmVhcmVzdF9kaXJzX2RlZztcbiAgICAgICAgLy8gICAgICAgIGlmIChJTkZPKSB7XG4gICAgICAgIC8vICAgICAgICAgICAgLy8gY29tcGFyZSByZXF1aXJlZCB2cy4gcHJlc2VudCBwb3NpdGlvbnMgaW4gSFJJUiBmaWx0ZXJcbiAgICAgICAgLy8gICAgICAgICAgICBsZXQgYW5ndWxhckRpc3REZWcgPSAwO1xuICAgICAgICAvLyAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbkRpcnM7IGkrKykge1xuICAgICAgICAvLyAgICAgICAgICAgICAgICBpZiAodGhpcy50YXJnZXRfZGlyc19kZWdbaV1bMF0gPCAwKSB0aGlzLnRhcmdldF9kaXJzX2RlZ1tpXVswXSArPSAzNjAuMDtcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgYW5ndWxhckRpc3REZWcgKz0gTWF0aC5zcXJ0KFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5wb3codGhpcy50YXJnZXRfZGlyc19kZWdbaV1bMF0gLSBncmFudGVkRmlsdGVyUG9zW2ldWzBdLCAyKSArXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLnBvdyh0aGlzLnRhcmdldF9kaXJzX2RlZ1tpXVsxXSAtIGdyYW50ZWRGaWx0ZXJQb3NbaV1bMV0sIDIpKTtcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ2Fza2VkIC8gZ3JhbnRlZCBwb3M6ICcsIHRoaXMud2lzaGVkU3BlYWtlclBvc1tpXSwgJy8nLCBncmFudGVkRmlsdGVyUG9zW2ldKTtcbiAgICAgICAgLy8gICAgICAgICAgICB9XG4gICAgICAgIC8vICAgICAgICAgICAgY29uc29sZS5sb2coJ3N1bW1lZCAvIGF2ZXJhZ2UgYW5ndWxhciBkaXN0IGJldHdlZW4gdGFyZ2V0IGFuZCBhY3R1YWwgcG9zOicsXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZChhbmd1bGFyRGlzdERlZyoxMDApLzEwMCwgJ2RlZyAvJyxcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKCAoYW5ndWxhckRpc3REZWcvdGhpcy53aXNoZWRTcGVha2VyUG9zLmxlbmd0aCkgKjEwMCkvMTAwLCAnZGVnJyk7XG4gICAgICAgIC8vICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0Q2xvc2VzdEhyaXJGaWx0ZXJzKG5lYXJlc3RJZHgsIGhyaXJzKSB7XG5cbiAgICAgICAgdmFyIG5EaXJzID0gbmVhcmVzdElkeC5sZW5ndGg7XG4gICAgICAgIHZhciBuZWFyZXN0X2hyaXJzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbkRpcnM7IGkrKykge1xuICAgICAgICAgICAgLy8gZ2V0IHJlc3BlY3RpdmUgaHJpcnNcbiAgICAgICAgICAgIG5lYXJlc3RfaHJpcnMucHVzaChocmlyc1tuZWFyZXN0SWR4W2ldXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5lYXJlc3RfaHJpcnM7XG4gICAgfVxuXG4gICAgY29tcHV0ZURlY0ZpbHRlcnMoKSB7XG5cbiAgICAgICAgLy8gbWF4IHJFIG9wdGltaXphdGlvblxuICAgICAgICB2YXIgYV9uID0gW107XG4gICAgICAgIGFfbi5wdXNoKDEpO1xuICAgICAgICBmb3IodmFyIGk9MTtpPCh0aGlzLm9yZGVyKzEpO2krKyl7XG4gICAgICAgICAgYV9uLnB1c2goTWF0aC5jb3MoKGkqTWF0aC5QSSkvKDIqdGhpcy5vcmRlcisyKSkpO1xuICAgICAgICAgIGFfbi5wdXNoKE1hdGguY29zKChpKk1hdGguUEkpLygyKnRoaXMub3JkZXIrMikpKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZGlhZ0EgPSBudW1lcmljLmRpYWcoYV9uKTtcbiAgICAgICAgLy8gZ2V0IGRlY29kaW5nIG1hdHJpeFxuICAgICAgICB0aGlzLmRlY29kaW5nTWF0cml4ID0gbnVtZXJpYy50cmFuc3Bvc2UodXRpbHMuZ2V0Q2lyY0hhcm1vbmljcyh0aGlzLm9yZGVyLHV0aWxzLmdldENvbHVtbih0aGlzLnZsc19kaXJzX2RlZywgMCkpKTtcbiAgICAgICAgdGhpcy5kZWNvZGluZ01hdHJpeCA9IG51bWVyaWMuZG90KHRoaXMuZGVjb2RpbmdNYXRyaXgsIGRpYWdBKTtcbiAgICAgICAgLy8gbm9ybWFsaXNlIHRvIG51bWJlciBvZiBzcGVha2Vyc1xuICAgICAgICB0aGlzLmRlY29kaW5nTWF0cml4ID0gbnVtZXJpYy5tdWwoKDIqTWF0aC5QSSkvdGhpcy52bHNfZGlyc19kZWcubGVuZ3RoLCB0aGlzLmRlY29kaW5nTWF0cml4KTtcbiAgICAgICAgLy8gY29udmVydCBocmlyIGZpbHRlcnMgdG8gaG9hIGZpbHRlcnNcbiAgICAgICAgdGhpcy5ob2FCdWZmZXJMID0gdGhpcy5nZXRIb2FGaWx0ZXJGcm9tSHJpckZpbHRlckwodGhpcy5uQ2gsIHRoaXMublNhbXBsZXMsIHRoaXMuZnMsIHRoaXMudmxzX2hyaXJzLCB0aGlzLmRlY29kaW5nTWF0cml4KTtcbiAgICAgICAgdGhpcy5ob2FCdWZmZXJSID0gdGhpcy5nZXRIb2FGaWx0ZXJGcm9tSHJpckZpbHRlclIodGhpcy5uQ2gsIHRoaXMublNhbXBsZXMsIHRoaXMuZnMsIHRoaXMudmxzX2hyaXJzLCB0aGlzLmRlY29kaW5nTWF0cml4KTtcbiAgICAgICAgICAgIC8vIHBhc3MgcmVzdWx0aW5nIGhvYSBmaWx0ZXJzIHRvIHVzZXIgY2FsbGJhY2sgTkVFRCBUTyBDSEFOR0UgVEhJUyBJTiBUSEUgUEFHRSBKUyEhIVxuICAgICAgICAgICAgICAgIC8vIGxvYWQgZmlsdGVycyBhbmQgYXNzaWduIHRvIGJ1ZmZlcnNcbiAgICAgICAgICAgICAgICAvL3ZhciBhc3NpZ25GaWx0ZXJzT25Mb2FkID0gZnVuY3Rpb24oYnVmZmVyTCxidWZmZXJSKSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc3VjY2Vzc2Z1bGx5IGxvYWRlZCBIT0EgYnVmZmVyOicsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgLy9kZWNvZGVyLnVwZGF0ZUZpbHRlcnMoYnVmZmVyTCxidWZmZXJSKTtcbiAgICAgICAgICAgICAgICAvL31cbiAgICAgICAgICAgICAgICAvL3ZhciBsb2FkZXJfZmlsdGVycyA9IG5ldyBhbWJpc29uaWNzLkhSSVJsb2FkZXIyRF9sb2NhbChjb250ZXh0LCBtYXhPcmRlciBhc3NpZ25GaWx0ZXJzT25Mb2FkKTtcbiAgICAgICAgICAgICAgICAvL2xvYWRlcl9maWx0ZXJzLmxvYWQoaXJVcmxfMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMub25Mb2FkKHRoaXMuaG9hQnVmZmVyTCx0aGlzLmhvYUJ1ZmZlclIpO1xuICAgICAgICAgICAgLy90aGlzLm9uTG9hZCh0aGlzLmhvYUJ1ZmZlclIpO1xuICAgIH1cblxuICAgIGdldEhvYUZpbHRlckZyb21IcmlyRmlsdGVyTChuQ2gsIG5TYW1wbGVzLCBzYW1wbGVSYXRlLCBocmlycywgZGVjb2RpbmdNYXRyaXgpIHtcbiAgICAgICAgLy8gY3JlYXRlIGVtcHR5IGJ1ZmZlciByZWFkeSB0byByZWNlaXZlIGhvYSBmaWx0ZXJzXG4gICAgICAgIGlmIChuU2FtcGxlcz5ocmlyc1swXVswXS5sZW5ndGgpIG5TYW1wbGVzID0gaHJpcnNbMF1bMF0ubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgLy8gV0lHIEVESVRcbiAgICAgICAgLy9sZXQgaG9hQnVmZmVyID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlcihuQ2gsIG5TYW1wbGVzLCBzYW1wbGVSYXRlKTtcbiAgICAgICAgbGV0IGhvYUJ1ZmZlckwgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyKG5DaCwgblNhbXBsZXMsIHNhbXBsZVJhdGUpO1xuICAgICAgICAvLyBFTkQgb2YgRURJVFxuICAgICAgICBcbiAgICAgICAgLy8gc3VtIHdlaWdodGVkIEhSSVIgb3ZlciBBbWJpc29uaWMgY2hhbm5lbHMgdG8gY3JlYXRlIEhPQSBJUnNcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuQ2g7IGkrKykge1xuICAgICAgICAgICAgbGV0IGNvbmNhdEJ1ZmZlckFycmF5TGVmdCA9IG5ldyBGbG9hdDMyQXJyYXkoblNhbXBsZXMpO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBocmlycy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgblNhbXBsZXM7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25jYXRCdWZmZXJBcnJheUxlZnRba10gKz0gZGVjb2RpbmdNYXRyaXhbal1baV0gKiBocmlyc1tqXVswXVtrXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBob2FCdWZmZXJMLmdldENoYW5uZWxEYXRhKGkpLnNldChjb25jYXRCdWZmZXJBcnJheUxlZnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBob2FCdWZmZXJMO1xuICAgIH1cbiAgICBcbiAgICBnZXRIb2FGaWx0ZXJGcm9tSHJpckZpbHRlclIobkNoLCBuU2FtcGxlcywgc2FtcGxlUmF0ZSwgaHJpcnMsIGRlY29kaW5nTWF0cml4KSB7XG4gICAgICAgIC8vIGNyZWF0ZSBlbXB0eSBidWZmZXIgcmVhZHkgdG8gcmVjZWl2ZSBob2EgZmlsdGVyc1xuICAgICAgICBpZiAoblNhbXBsZXM+aHJpcnNbMF1bMF0ubGVuZ3RoKSBuU2FtcGxlcyA9IGhyaXJzWzBdWzBdLmxlbmd0aDtcbiAgICAgICAgbGV0IGhvYUJ1ZmZlclIgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyKG5DaCwgblNhbXBsZXMsIHNhbXBsZVJhdGUpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3VtIHdlaWdodGVkIEhSSVIgb3ZlciBBbWJpc29uaWMgY2hhbm5lbHMgdG8gY3JlYXRlIEhPQSBJUnNcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuQ2g7IGkrKykge1xuICAgICAgICAgICAgbGV0IGNvbmNhdEJ1ZmZlckFycmF5UmlnaHQgPSBuZXcgRmxvYXQzMkFycmF5KG5TYW1wbGVzKTtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgaHJpcnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8IG5TYW1wbGVzOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uY2F0QnVmZmVyQXJyYXlSaWdodFtrXSArPSBkZWNvZGluZ01hdHJpeFtqXVtpXSAqIGhyaXJzW2pdWzFdW2tdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGhvYUJ1ZmZlclIuZ2V0Q2hhbm5lbERhdGEoaSkuc2V0KGNvbmNhdEJ1ZmZlckFycmF5UmlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBob2FCdWZmZXJSO1xuICAgIH1cbn1cbiJdfQ==