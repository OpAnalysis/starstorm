"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.json2satrec = json2satrec;
exports.twoline2satrec = twoline2satrec;
var _constants = require("./constants");
var _ext = require("./ext");
var _sgp4init = _interopRequireDefault(require("./propagation/sgp4init"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
/* -----------------------------------------------------------------------------
 *
 *                           function twoline2satrec
 *
 *  this function converts the two line element set character string data to
 *    variables and initializes the sgp4 variables. several intermediate varaibles
 *    and quantities are determined. note that the result is a structure so multiple
 *    satellites can be processed simultaneously without having to reinitialize. the
 *    verification mode is an important option that permits quick checks of any
 *    changes to the underlying technical theory. this option works using a
 *    modified tle file in which the start, stop, and delta time values are
 *    included at the end of the second line of data. this only works with the
 *    verification mode. the catalog mode simply propagates from -1440 to 1440 min
 *    from epoch and is useful when performing entire catalog runs.
 *
 *  author        : david vallado                  719-573-2600    1 mar 2001
 *
 *  inputs        :
 *    longstr1    - first line of the tle
 *    longstr2    - second line of the tle
 *    typerun     - type of run                    verification 'v', catalog 'c',
 *                                                 manual 'm'
 *    typeinput   - type of manual input           mfe 'm', epoch 'e', dayofyr 'd'
 *    opsmode     - mode of operation afspc or improved 'a', 'i'
 *    whichconst  - which set of constants to use  72, 84
 *
 *  outputs       :
 *    satrec      - structure containing all the sgp4 satellite information
 *
 *  coupling      :
 *    getgravconst-
 *    days2mdhms  - conversion of days to month, day, hour, minute, second
 *    jday        - convert day month year hour minute second into julian date
 *    sgp4init    - initialize the sgp4 variables
 *
 *  references    :
 *    norad spacetrack report #3
 *    vallado, crawford, hujsak, kelso  2006
 --------------------------------------------------------------------------- */
/**
 * Return a Satellite imported from two lines of TLE data.
 *
 * Provide the two TLE lines as strings `tleLine1` and `tleLine2`,
 * and select which standard set of gravitational constants you want
 * by providing `gravity_constants`:
 *
 * `sgp4.propagation.wgs72` - Standard WGS 72 model
 * `sgp4.propagation.wgs84` - More recent WGS 84 model
 * `sgp4.propagation.wgs72old` - Legacy support for old SGP4 behavior
 *
 * Normally, computations are made using letious recent improvements
 * to the algorithm.  If you want to turn some of these off and go
 * back into "afspc" mode, then set `afspc_mode` to `True`.
 */
function twoline2satrec(longstr1, longstr2) {
  var opsmode = 'i';
  var error = 0;
  var satnum = longstr1.substring(2, 7);
  var epochyr = parseInt(longstr1.substring(18, 20), 10);
  var epochdays = parseFloat(longstr1.substring(20, 32));
  var ndot = parseFloat(longstr1.substring(33, 43));
  var nddot = parseFloat("".concat(longstr1.substring(44, 45), ".").concat(longstr1.substring(45, 50), "E").concat(longstr1.substring(50, 52)));
  var bstar = parseFloat("".concat(longstr1.substring(53, 54), ".").concat(longstr1.substring(54, 59), "E").concat(longstr1.substring(59, 61)));
  // satrec.satnum = longstr2.substring(2, 7);
  // ---- find standard orbital elements ----
  var inclo = parseFloat(longstr2.substring(8, 16)) * _constants.deg2rad;
  var nodeo = parseFloat(longstr2.substring(17, 25)) * _constants.deg2rad;
  var ecco = parseFloat(".".concat(longstr2.substring(26, 33)));
  var argpo = parseFloat(longstr2.substring(34, 42)) * _constants.deg2rad;
  var mo = parseFloat(longstr2.substring(43, 51)) * _constants.deg2rad;
  // ---- find no, ndot, nddot ----
  var no = parseFloat(longstr2.substring(52, 63)) / _constants.xpdotp;
  // satrec.nddot= satrec.nddot * Math.pow(10.0, nexp);
  // satrec.bstar= satrec.bstar * Math.pow(10.0, ibexp);
  // ---- convert to sgp4 units ----
  // satrec.ndot /= (xpdotp * 1440.0); // ? * minperday
  // satrec.nddot /= (xpdotp * 1440.0 * 1440);
  // ----------------------------------------------------------------
  // find sgp4epoch time of element set
  // remember that sgp4 uses units of days from 0 jan 1950 (sgp4epoch)
  // and minutes from the epoch (time)
  // ----------------------------------------------------------------
  // ---------------- temp fix for years from 1957-2056 -------------------
  // --------- correct fix will occur when year is 4-digit in tle ---------
  var year = epochyr < 57 ? epochyr + 2000 : epochyr + 1900;
  var mdhmsResult = (0, _ext.days2mdhms)(year, epochdays);
  var mon = mdhmsResult.mon,
    day = mdhmsResult.day,
    hr = mdhmsResult.hr,
    minute = mdhmsResult.minute,
    sec = mdhmsResult.sec;
  var jdsatepoch = (0, _ext.jday)(year, mon, day, hr, minute, sec);
  var satrec = {
    error: error,
    satnum: satnum,
    epochyr: epochyr,
    epochdays: epochdays,
    ndot: ndot,
    nddot: nddot,
    bstar: bstar,
    inclo: inclo,
    nodeo: nodeo,
    ecco: ecco,
    argpo: argpo,
    mo: mo,
    no: no,
    jdsatepoch: jdsatepoch
  };
  //  ---------------- initialize the orbit at sgp4epoch -------------------
  (0, _sgp4init["default"])(satrec, {
    opsmode: opsmode,
    satn: satrec.satnum,
    epoch: satrec.jdsatepoch - 2433281.5,
    xbstar: satrec.bstar,
    xecco: satrec.ecco,
    xargpo: satrec.argpo,
    xinclo: satrec.inclo,
    xmo: satrec.mo,
    xno: satrec.no,
    xnodeo: satrec.nodeo
  });
  return satrec;
}
/* -----------------------------------------------------------------------------
 *
 *                           function json2satrec
 *
 *  this function converts the OMM json data to variables and initializes the sgp4
 *    variables. several intermediate varaibles and quantities are determined. note
 *    that the result is a structure so multiple satellites can be processed
 *    simultaneously without having to reinitialize. the verification mode is an
 *    important option that permits quick checks of any changes to the underlying
 *    technical theory. this option works using a modified tle file in which the
 *    start, stop, and delta time values are included at the end of the second line
 *    of data. this only works with the verification mode. the catalog mode simply
 *    propagates from -1440 to 1440 min from epoch and is useful when performing
 *    entire catalog runs.
 *
 *  author        : Hariharan Vitaladevuni                   18 Aug 2023
 *                  Theodore Kruczek                         19 Aug 2023
 *
 *  inputs        :
 *    jsonobj     - OMM json data
 *    opsmode     - mode of operation afspc or improved 'a', 'i'. Default: 'i'.
 *
 *  outputs       :
 *    satrec      - structure containing all the sgp4 satellite information
 *
 *  coupling      :
 *    days2mdhms  - conversion of days to month, day, hour, minute, second
 *    jday        - convert day month year hour minute second into julian date
 *    sgp4init    - initialize the sgp4 variables
 *
 *  warning       : the epoch date in OMM format is more accurate than TLE format!
 *                  this will result in extremely close, but different
 *                  position/velocity values. Depending on your use case, it may
 *                  be better to use twoline2satrec, but for the average user this
 *                  will provide comparable results.
 *
 *  references    :
 *    https://celestrak.org/NORAD/documentation/gp-data-formats.php
 --------------------------------------------------------------------------- */
function json2satrec(jsonobj) {
  var opsmode = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'i';
  var error = 0;
  var satnum = jsonobj.NORAD_CAT_ID.toString();
  var epoch = new Date(jsonobj.EPOCH + 'Z');
  var year = epoch.getUTCFullYear();
  var epochyr = Number(year.toString().slice(-2));
  var epochdays = (epoch.valueOf() - new Date(Date.UTC(year, 0, 1, 0, 0, 0)).valueOf()) / (86400 * 1000) + 1;
  var ndot = Number(jsonobj.MEAN_MOTION_DOT);
  var nddot = Number(jsonobj.MEAN_MOTION_DDOT);
  var bstar = Number(jsonobj.BSTAR);
  var inclo = Number(jsonobj.INCLINATION) * _constants.deg2rad;
  var nodeo = Number(jsonobj.RA_OF_ASC_NODE) * _constants.deg2rad;
  var ecco = Number(jsonobj.ECCENTRICITY);
  var argpo = Number(jsonobj.ARG_OF_PERICENTER) * _constants.deg2rad;
  var mo = Number(jsonobj.MEAN_ANOMALY) * _constants.deg2rad;
  var no = Number(jsonobj.MEAN_MOTION) / _constants.xpdotp;
  // ----------------------------------------------------------------
  // find sgp4epoch time of element set
  // remember that sgp4 uses units of days from 0 jan 1950 (sgp4epoch)
  // and minutes from the epoch (time)
  // ----------------------------------------------------------------
  var mdhmsResult = (0, _ext.days2mdhms)(year, epochdays);
  var mon = mdhmsResult.mon,
    day = mdhmsResult.day,
    hr = mdhmsResult.hr,
    minute = mdhmsResult.minute,
    sec = mdhmsResult.sec;
  var jdsatepoch = (0, _ext.jday)(year, mon, day, hr, minute, sec);
  var satrec = {
    error: error,
    satnum: satnum,
    epochyr: epochyr,
    epochdays: epochdays,
    ndot: ndot,
    nddot: nddot,
    bstar: bstar,
    inclo: inclo,
    nodeo: nodeo,
    ecco: ecco,
    argpo: argpo,
    mo: mo,
    no: no,
    jdsatepoch: jdsatepoch
  };
  //  ---------------- initialize the orbit at sgp4epoch -------------------
  (0, _sgp4init["default"])(satrec, {
    opsmode: opsmode,
    satn: satrec.satnum,
    epoch: satrec.jdsatepoch - 2433281.5,
    xbstar: satrec.bstar,
    xecco: satrec.ecco,
    xargpo: satrec.argpo,
    xinclo: satrec.inclo,
    xmo: satrec.mo,
    xno: satrec.no,
    xnodeo: satrec.nodeo
  });
  return satrec;
}