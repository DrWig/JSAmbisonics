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

// NOTE THAT CURRENT LIMIT IS 7th ORDER

var utils = require("./utils.js");

var HRIRloader2Dasym_local = function () {
    function HRIRloader2Dasym_local(context, order, callback) {
        (0, _classCallCheck3.default)(this, HRIRloader2Dasym_local);

        this.context = context;
        this.order = order;
        this.nCh = 2 * order + 1;
        // function called when filters loaded
        this.onLoad = callback;
        // define required virtual speaker positions based on Ambisonic order
        this.vls_dirs_deg = utils.sampleCircle(2 * this.order + 2); //2n+2 virtual speakers for 2D
        this.nVLS = this.vls_dirs_deg.length;
        // angular resolution for fast lookup to closest HRIR to a given direction
        this.nearestLookupRes = [5, 5];
    }

    (0, _createClass3.default)(HRIRloader2Dasym_local, [{
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
            this.hoaBuffer = this.getHoaFilterFromHrirFilter(this.nCh, this.nSamples, this.fs, this.vls_hrirs, this.decodingMatrix);
            // pass resulting hoa filters to user callback
            this.onLoad(this.hoaBuffer);
        }
    }, {
        key: "getHoaFilterFromHrirFilter",
        value: function getHoaFilterFromHrirFilter(nCh, nSamples, sampleRate, hrirs, decodingMatrix) {
            // create empty buffer ready to receive hoa filters
            if (nSamples > hrirs[0][0].length) nSamples = hrirs[0][0].length;

            // WIG EDIT
            //let hoaBuffer = this.context.createBuffer(nCh, nSamples, sampleRate);
            var hoaBuffer = this.context.createBuffer(nCh * 2, nSamples, sampleRate);
            // END of EDIT

            // sum weighted HRIR over Ambisonic channels to create HOA IRs
            for (var i = 0; i < nCh; i++) {
                var concatBufferArrayLeft = new Float32Array(nSamples);
                // WIG EDIT
                var concatBufferArrayRight = new Float32Array(nSamples);
                // END of EDIT
                for (var j = 0; j < hrirs.length; j++) {
                    for (var k = 0; k < nSamples; k++) {
                        concatBufferArrayLeft[k] += decodingMatrix[j][i] * hrirs[j][0][k];
                        // WIG EDIT
                        concatBufferArrayRight[k] += decodingMatrix[j][i] * hrirs[j][1][k];
                        // END of EDIT
                    }
                }
                hoaBuffer.getChannelData(i).set(concatBufferArrayLeft);
                // WIG EDIT
                hoaBuffer.getChannelData(i + nCh).set(concatBufferArrayRight);
                // END of EDIT
            }
            return hoaBuffer;
        }
    }]);
    return HRIRloader2Dasym_local;
}();

exports.default = HRIRloader2Dasym_local;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhyaXItbG9hZGVyMkRhc3ltX2xvY2FsLmpzIl0sIm5hbWVzIjpbInV0aWxzIiwicmVxdWlyZSIsIkhSSVJsb2FkZXIyRGFzeW1fbG9jYWwiLCJjb250ZXh0Iiwib3JkZXIiLCJjYWxsYmFjayIsIm5DaCIsIm9uTG9hZCIsInZsc19kaXJzX2RlZyIsInNhbXBsZUNpcmNsZSIsIm5WTFMiLCJsZW5ndGgiLCJuZWFyZXN0TG9va3VwUmVzIiwic2V0VXJsIiwic2VsZiIsInJlcXVlc3RIcmlyIiwiWE1MSHR0cFJlcXVlc3QiLCJvcGVuIiwicmVzcG9uc2VUeXBlIiwib25sb2FkIiwicGFyc2VIcmlyRnJvbUpTT04iLCJyZXNwb25zZSIsIm5lYXJlc3RMb29rdXAiLCJjcmVhdGVOZWFyZXN0TG9va3VwIiwiaHJpcl9kaXJzX2RlZyIsIm5lYXJlc3RJZHgiLCJmaW5kTmVhcmVzdCIsIm5lYXJlc3RfZGlyc19kZWciLCJnZXRDbG9zZXN0RGlycyIsInZsc19ocmlycyIsImdldENsb3Nlc3RIcmlyRmlsdGVycyIsImhyaXJzIiwiY29tcHV0ZURlY0ZpbHRlcnMiLCJzZW5kIiwiaHJpclNldCIsImZzIiwibGVhdmVzIiwiZGF0YSIsIm5IcmlycyIsIm5TYW1wbGVzIiwiZm9yRWFjaCIsImVsZW1lbnQiLCJwdXNoIiwibGVmdCIsIkZsb2F0NjRBcnJheSIsInJpZ2h0IiwibkRpcnMiLCJpIiwibmVhcmVzdF9ocmlycyIsImFfbiIsIk1hdGgiLCJjb3MiLCJQSSIsImRpYWdBIiwibnVtZXJpYyIsImRpYWciLCJkZWNvZGluZ01hdHJpeCIsInRyYW5zcG9zZSIsImdldENpcmNIYXJtb25pY3MiLCJnZXRDb2x1bW4iLCJkb3QiLCJtdWwiLCJob2FCdWZmZXIiLCJnZXRIb2FGaWx0ZXJGcm9tSHJpckZpbHRlciIsInNhbXBsZVJhdGUiLCJjcmVhdGVCdWZmZXIiLCJjb25jYXRCdWZmZXJBcnJheUxlZnQiLCJGbG9hdDMyQXJyYXkiLCJjb25jYXRCdWZmZXJBcnJheVJpZ2h0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QUFDQUosMEJBQVVTLGNBQVYsQ0FBeUJ4QixJQUFFekMsR0FBM0IsRUFBZ0NrRSxHQUFoQyxDQUFvQ0osc0JBQXBDO0FBQ0E7QUFDSDtBQUNELG1CQUFPTixTQUFQO0FBQ0g7Ozs7O2tCQTlJZ0I1RCxzQiIsImZpbGUiOiJocmlyLWxvYWRlcjJEYXN5bV9sb2NhbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgQXJjaG9udGlzIFBvbGl0aXMgKEFhbHRvIFVuaXZlcnNpdHkpXG4vLyAgYXJjaG9udGlzLnBvbGl0aXNAYWFsdG8uZmlcbi8vICBEYXZpZCBQb2lyaWVyLVF1aW5vdCAoSVJDQU0pXG4vLyAgZGF2aXBvaXJAaXJjYW0uZnJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vL1xuLy8gIEpTQW1iaXNvbmljcyBhIEphdmFTY3JpcHQgbGlicmFyeSBmb3IgaGlnaGVyLW9yZGVyIEFtYmlzb25pY3Ncbi8vICBUaGUgbGlicmFyeSBpbXBsZW1lbnRzIFdlYiBBdWRpbyBibG9ja3MgdGhhdCBwZXJmb3JtXG4vLyAgdHlwaWNhbCBhbWJpc29uaWMgcHJvY2Vzc2luZyBvcGVyYXRpb25zIG9uIGF1ZGlvIHNpZ25hbHMuXG4vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vL1xuLy8gIEhSSVJsb2FkZXIgZm9yIDJEIHVzZVxuLy8gIGFkYXB0ZWQgYnkgVGhvbWFzIERlcHBpc2NoXG4vLyAgdGhvbWFzLmRlcHBpc2NoOTNAZ21haWwuY29tXG4vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vL1xuLy8gIGJpbkRlY29kZXIgZm9yIDJEIHVzaW5nIGFzeXltZXRyaWNhbCBmaWx0ZXJzIGZvciByb29tIG1vZGVsbGluZ1xuLy8gIGFkYXB0ZWQgYnkgQnJ1Y2UgV2lnZ2lucyAmIE1hcmsgRHJpbmdcbi8vICBiLmoud2lnZ2luc0BkZXJieS5hYy51a1xuLy8gIG0uZHJpbmdAZGVyYnkuYWMudWtcbi8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vL1xuLyogSFJJUiBMT0FERVIgMkQgQXN5bW1ldHJpY2FsIEZpbHRlcnMqL1xuLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vLyBOT1RFIFRIQVQgQ1VSUkVOVCBMSU1JVCBJUyA3dGggT1JERVJcblxudmFyIHV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHMuanNcIik7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhSSVJsb2FkZXIyRGFzeW1fbG9jYWwge1xuICAgIGNvbnN0cnVjdG9yKGNvbnRleHQsIG9yZGVyLCBjYWxsYmFjaykge1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLm9yZGVyID0gb3JkZXI7XG4gICAgICAgIHRoaXMubkNoID0gMipvcmRlciArIDE7XG4gICAgICAgIC8vIGZ1bmN0aW9uIGNhbGxlZCB3aGVuIGZpbHRlcnMgbG9hZGVkXG4gICAgICAgIHRoaXMub25Mb2FkID0gY2FsbGJhY2s7XG4gICAgICAgIC8vIGRlZmluZSByZXF1aXJlZCB2aXJ0dWFsIHNwZWFrZXIgcG9zaXRpb25zIGJhc2VkIG9uIEFtYmlzb25pYyBvcmRlclxuICAgICAgICB0aGlzLnZsc19kaXJzX2RlZyA9IHV0aWxzLnNhbXBsZUNpcmNsZSgyKnRoaXMub3JkZXIgKyAyKTsgLy8ybisyIHZpcnR1YWwgc3BlYWtlcnMgZm9yIDJEXG4gICAgICAgIHRoaXMublZMUyA9IHRoaXMudmxzX2RpcnNfZGVnLmxlbmd0aDtcbiAgICAgICAgLy8gYW5ndWxhciByZXNvbHV0aW9uIGZvciBmYXN0IGxvb2t1cCB0byBjbG9zZXN0IEhSSVIgdG8gYSBnaXZlbiBkaXJlY3Rpb25cbiAgICAgICAgdGhpcy5uZWFyZXN0TG9va3VwUmVzID0gWzUsNV07XG4gICAgfVxuXG4gICAgbG9hZChzZXRVcmwpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIC8vIHNldHVwIHRoZSByZXF1ZXN0XG4gICAgICAgIHZhciByZXF1ZXN0SHJpciA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByZXF1ZXN0SHJpci5vcGVuKFwiR0VUXCIsIHNldFVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3RIcmlyLnJlc3BvbnNlVHlwZSA9IFwianNvblwiO1xuICAgICAgICByZXF1ZXN0SHJpci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIGxvYWQgdXNlZnVsIEhSSVIgc3R1ZmYgZnJvbSBKU09OXG4gICAgICAgICAgICBzZWxmLnBhcnNlSHJpckZyb21KU09OKHJlcXVlc3RIcmlyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIC8vIGNvbnN0cnVjdCBsb29rdXAgdGFibGUgZm9yIGZhc3QgY2xvc2VzdCBIUklSIGZpbmRpbmdcbiAgICAgICAgICAgIHNlbGYubmVhcmVzdExvb2t1cCA9IHV0aWxzLmNyZWF0ZU5lYXJlc3RMb29rdXAoc2VsZi5ocmlyX2RpcnNfZGVnLCBzZWxmLm5lYXJlc3RMb29rdXBSZXMpO1xuICAgICAgICAgICAgLy8gZmluZCBjbG9zZXN0IGluZGljZXMgdG8gVkxTXG4gICAgICAgICAgICBsZXQgbmVhcmVzdElkeCA9IHV0aWxzLmZpbmROZWFyZXN0KHNlbGYudmxzX2RpcnNfZGVnLCBzZWxmLm5lYXJlc3RMb29rdXAsIHNlbGYubmVhcmVzdExvb2t1cFJlcyk7XG4gICAgICAgICAgICAvLyBnZXQgY2xvc2VzdCBIUklScyB0byB0aGUgVkxTIGRlc2lnblxuICAgICAgICAgICAgc2VsZi5uZWFyZXN0X2RpcnNfZGVnID0gc2VsZi5nZXRDbG9zZXN0RGlycyhuZWFyZXN0SWR4LCBzZWxmLmhyaXJfZGlyc19kZWcpO1xuICAgICAgICAgICAgc2VsZi52bHNfaHJpcnMgPSBzZWxmLmdldENsb3Nlc3RIcmlyRmlsdGVycyhuZWFyZXN0SWR4LCBzZWxmLmhyaXJzKTtcbiAgICAgICAgICAgIC8vIGNvbXB1dGUgYW1iaXNvbmljIGRlY29kaW5nIGZpbHRlcnNcbiAgICAgICAgICAgIHNlbGYuY29tcHV0ZURlY0ZpbHRlcnMoKTtcbiAgICAgICAgfVxuICAgICAgICByZXF1ZXN0SHJpci5zZW5kKCk7IC8vIFNlbmQgdGhlIFJlcXVlc3QgYW5kIExvYWQgdGhlIEZpbGVcbiAgICB9XG5cbiAgICBwYXJzZUhyaXJGcm9tSlNPTihocmlyU2V0KSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5mcyA9IGhyaXJTZXQubGVhdmVzWzZdLmRhdGFbMF07ICAgICAgICAgICAgICAgICAgICAvLyBzYW1wbGVyYXRlIG9mIHRoZSBzZXRcbiAgICAgICAgdGhpcy5uSHJpcnMgPSBocmlyU2V0LmxlYXZlc1s0XS5kYXRhLmxlbmd0aDsgICAgICAgICAgICAvLyBudW1iZXIgb2YgSFJJUiBtZWFzdXJlbWVudHNcbiAgICAgICAgdGhpcy5uU2FtcGxlcyA9IGhyaXJTZXQubGVhdmVzWzhdLmRhdGFbMF1bMV0ubGVuZ3RoOyAgICAvLyBsZW5ndGggb2YgSFJJUnNcbiAgICAgICAgLy8gcGFyc2UgYXppbXV0aC1lbGV2YXRpb24gb2YgSFJJUnNcbiAgICAgICAgdGhpcy5ocmlyX2RpcnNfZGVnID0gW107XG4gICAgICAgIGhyaXJTZXQubGVhdmVzWzRdLmRhdGEuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmhyaXJfZGlyc19kZWcucHVzaChbZWxlbWVudFswXSwgZWxlbWVudFsxXV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIC8vIHBhcnNlIEhSSVIgYnVmZmVyc1xuICAgICAgICB0aGlzLmhyaXJzID0gW107XG4gICAgICAgIGhyaXJTZXQubGVhdmVzWzhdLmRhdGEuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGVmdCA9IG5ldyBGbG9hdDY0QXJyYXkoZWxlbWVudFswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmlnaHQgPSBuZXcgRmxvYXQ2NEFycmF5KGVsZW1lbnRbMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5ocmlycy5wdXNoKFtsZWZ0LCByaWdodF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBnZXRDbG9zZXN0RGlycyhuZWFyZXN0SWR4LCBocmlyX2RpcnNfZGVnKSB7XG4gICAgLy8gZ2V0Q2xvc2VzdEhyaXJGaWx0ZXJzKHRhcmdldF9kaXJzX2RlZywgaHJpcl9kaXJzX2RlZywgSU5GTykge1xuICAgICAgICB2YXIgbkRpcnMgPSBuZWFyZXN0SWR4Lmxlbmd0aDtcbiAgICAgICAgdmFyIG5lYXJlc3RfZGlyc19kZWcgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuRGlyczsgaSsrKSB7XG4gICAgICAgICAgICAvLyBnZXQgYXZhaWxhYmxlIHBvc2l0aW9ucyAoaW4gdGhlIEhSSVIgc2V0KSBuZWFyZXN0IGZyb20gdGhlIHJlcXVpcmVkIHNwZWFrZXJzIHBvc2l0aW9uc1xuICAgICAgICAgICAgbmVhcmVzdF9kaXJzX2RlZy5wdXNoKGhyaXJfZGlyc19kZWdbbmVhcmVzdElkeFtpXV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZWFyZXN0X2RpcnNfZGVnO1xuICAgICAgICAvLyAgICAgICAgaWYgKElORk8pIHtcbiAgICAgICAgLy8gICAgICAgICAgICAvLyBjb21wYXJlIHJlcXVpcmVkIHZzLiBwcmVzZW50IHBvc2l0aW9ucyBpbiBIUklSIGZpbHRlclxuICAgICAgICAvLyAgICAgICAgICAgIGxldCBhbmd1bGFyRGlzdERlZyA9IDA7XG4gICAgICAgIC8vICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuRGlyczsgaSsrKSB7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhcmdldF9kaXJzX2RlZ1tpXVswXSA8IDApIHRoaXMudGFyZ2V0X2RpcnNfZGVnW2ldWzBdICs9IDM2MC4wO1xuICAgICAgICAvLyAgICAgICAgICAgICAgICBhbmd1bGFyRGlzdERlZyArPSBNYXRoLnNxcnQoXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLnBvdyh0aGlzLnRhcmdldF9kaXJzX2RlZ1tpXVswXSAtIGdyYW50ZWRGaWx0ZXJQb3NbaV1bMF0sIDIpICtcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGgucG93KHRoaXMudGFyZ2V0X2RpcnNfZGVnW2ldWzFdIC0gZ3JhbnRlZEZpbHRlclBvc1tpXVsxXSwgMikpO1xuICAgICAgICAvLyAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnYXNrZWQgLyBncmFudGVkIHBvczogJywgdGhpcy53aXNoZWRTcGVha2VyUG9zW2ldLCAnLycsIGdyYW50ZWRGaWx0ZXJQb3NbaV0pO1xuICAgICAgICAvLyAgICAgICAgICAgIH1cbiAgICAgICAgLy8gICAgICAgICAgICBjb25zb2xlLmxvZygnc3VtbWVkIC8gYXZlcmFnZSBhbmd1bGFyIGRpc3QgYmV0d2VlbiB0YXJnZXQgYW5kIGFjdHVhbCBwb3M6JyxcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKGFuZ3VsYXJEaXN0RGVnKjEwMCkvMTAwLCAnZGVnIC8nLFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQoIChhbmd1bGFyRGlzdERlZy90aGlzLndpc2hlZFNwZWFrZXJQb3MubGVuZ3RoKSAqMTAwKS8xMDAsICdkZWcnKTtcbiAgICAgICAgLy8gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXRDbG9zZXN0SHJpckZpbHRlcnMobmVhcmVzdElkeCwgaHJpcnMpIHtcblxuICAgICAgICB2YXIgbkRpcnMgPSBuZWFyZXN0SWR4Lmxlbmd0aDtcbiAgICAgICAgdmFyIG5lYXJlc3RfaHJpcnMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuRGlyczsgaSsrKSB7XG4gICAgICAgICAgICAvLyBnZXQgcmVzcGVjdGl2ZSBocmlyc1xuICAgICAgICAgICAgbmVhcmVzdF9ocmlycy5wdXNoKGhyaXJzW25lYXJlc3RJZHhbaV1dKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmVhcmVzdF9ocmlycztcbiAgICB9XG5cbiAgICBjb21wdXRlRGVjRmlsdGVycygpIHtcblxuICAgICAgICAvLyBtYXggckUgb3B0aW1pemF0aW9uXG4gICAgICAgIHZhciBhX24gPSBbXTtcbiAgICAgICAgYV9uLnB1c2goMSk7XG4gICAgICAgIGZvcih2YXIgaT0xO2k8KHRoaXMub3JkZXIrMSk7aSsrKXtcbiAgICAgICAgICBhX24ucHVzaChNYXRoLmNvcygoaSpNYXRoLlBJKS8oMip0aGlzLm9yZGVyKzIpKSk7XG4gICAgICAgICAgYV9uLnB1c2goTWF0aC5jb3MoKGkqTWF0aC5QSSkvKDIqdGhpcy5vcmRlcisyKSkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBkaWFnQSA9IG51bWVyaWMuZGlhZyhhX24pO1xuICAgICAgICAvLyBnZXQgZGVjb2RpbmcgbWF0cml4XG4gICAgICAgIHRoaXMuZGVjb2RpbmdNYXRyaXggPSBudW1lcmljLnRyYW5zcG9zZSh1dGlscy5nZXRDaXJjSGFybW9uaWNzKHRoaXMub3JkZXIsdXRpbHMuZ2V0Q29sdW1uKHRoaXMudmxzX2RpcnNfZGVnLCAwKSkpO1xuICAgICAgICB0aGlzLmRlY29kaW5nTWF0cml4ID0gbnVtZXJpYy5kb3QodGhpcy5kZWNvZGluZ01hdHJpeCwgZGlhZ0EpO1xuICAgICAgICAvLyBub3JtYWxpc2UgdG8gbnVtYmVyIG9mIHNwZWFrZXJzXG4gICAgICAgIHRoaXMuZGVjb2RpbmdNYXRyaXggPSBudW1lcmljLm11bCgoMipNYXRoLlBJKS90aGlzLnZsc19kaXJzX2RlZy5sZW5ndGgsIHRoaXMuZGVjb2RpbmdNYXRyaXgpO1xuICAgICAgICAvLyBjb252ZXJ0IGhyaXIgZmlsdGVycyB0byBob2EgZmlsdGVyc1xuICAgICAgICB0aGlzLmhvYUJ1ZmZlciA9IHRoaXMuZ2V0SG9hRmlsdGVyRnJvbUhyaXJGaWx0ZXIodGhpcy5uQ2gsIHRoaXMublNhbXBsZXMsIHRoaXMuZnMsIHRoaXMudmxzX2hyaXJzLCB0aGlzLmRlY29kaW5nTWF0cml4KTtcbiAgICAgICAgLy8gcGFzcyByZXN1bHRpbmcgaG9hIGZpbHRlcnMgdG8gdXNlciBjYWxsYmFja1xuICAgICAgICB0aGlzLm9uTG9hZCh0aGlzLmhvYUJ1ZmZlcik7XG4gICAgfVxuXG4gICAgZ2V0SG9hRmlsdGVyRnJvbUhyaXJGaWx0ZXIobkNoLCBuU2FtcGxlcywgc2FtcGxlUmF0ZSwgaHJpcnMsIGRlY29kaW5nTWF0cml4KSB7XG4gICAgICAgIC8vIGNyZWF0ZSBlbXB0eSBidWZmZXIgcmVhZHkgdG8gcmVjZWl2ZSBob2EgZmlsdGVyc1xuICAgICAgICBpZiAoblNhbXBsZXM+aHJpcnNbMF1bMF0ubGVuZ3RoKSBuU2FtcGxlcyA9IGhyaXJzWzBdWzBdLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIC8vIFdJRyBFRElUXG4gICAgICAgIC8vbGV0IGhvYUJ1ZmZlciA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXIobkNoLCBuU2FtcGxlcywgc2FtcGxlUmF0ZSk7XG4gICAgICAgIGxldCBob2FCdWZmZXIgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyKG5DaCoyLCBuU2FtcGxlcywgc2FtcGxlUmF0ZSk7XG4gICAgICAgIC8vIEVORCBvZiBFRElUXG4gICAgICAgIFxuICAgICAgICAvLyBzdW0gd2VpZ2h0ZWQgSFJJUiBvdmVyIEFtYmlzb25pYyBjaGFubmVscyB0byBjcmVhdGUgSE9BIElSc1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5DaDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgY29uY2F0QnVmZmVyQXJyYXlMZWZ0ID0gbmV3IEZsb2F0MzJBcnJheShuU2FtcGxlcyk7XG4gICAgICAgICAgICAvLyBXSUcgRURJVFxuICAgICAgICAgICAgbGV0IGNvbmNhdEJ1ZmZlckFycmF5UmlnaHQgPSBuZXcgRmxvYXQzMkFycmF5KG5TYW1wbGVzKTtcbiAgICAgICAgICAgIC8vIEVORCBvZiBFRElUXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGhyaXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBuU2FtcGxlczsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmNhdEJ1ZmZlckFycmF5TGVmdFtrXSArPSBkZWNvZGluZ01hdHJpeFtqXVtpXSAqIGhyaXJzW2pdWzBdW2tdO1xuICAgICAgICAgICAgICAgICAgICAvLyBXSUcgRURJVFxuICAgICAgICAgICAgICAgICAgICBjb25jYXRCdWZmZXJBcnJheVJpZ2h0W2tdICs9IGRlY29kaW5nTWF0cml4W2pdW2ldICogaHJpcnNbal1bMV1ba107XG4gICAgICAgICAgICAgICAgICAgIC8vIEVORCBvZiBFRElUXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaG9hQnVmZmVyLmdldENoYW5uZWxEYXRhKGkpLnNldChjb25jYXRCdWZmZXJBcnJheUxlZnQpO1xuICAgICAgICAgICAgLy8gV0lHIEVESVRcbiAgICAgICAgICAgIGhvYUJ1ZmZlci5nZXRDaGFubmVsRGF0YShpK25DaCkuc2V0KGNvbmNhdEJ1ZmZlckFycmF5UmlnaHQpO1xuICAgICAgICAgICAgLy8gRU5EIG9mIEVESVRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaG9hQnVmZmVyO1xuICAgIH1cblxufVxuIl19