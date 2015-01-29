var fs     = require('fs');
var path   = require('path');
var mkdirp = require('mkdirp');
var csv    = require('csv');

/**
 * @param {String}   ipBlocksInputFilePath
 * @param {String}   citiesInputFilePath
 * @param {String}   outputDirPath
 * @param {Function} [callback]
 */
exports.convert = function(ipBlocksInputFilePath, citiesInputFilePath, outputDirPath, callback) {
    mkdirp(outputDirPath);

    var ipBlocksOutputFilePath = path.join(outputDirPath, 'GeoLiteCity-Blocks.csv');

    var ipBlocksInputStream  = fs.createReadStream(ipBlocksInputFilePath);
    var ipBlocksOutputStream = fs.createWriteStream(ipBlocksOutputFilePath);

    ipBlocksOutputStream.on('error', function(err) {
        if (callback) {
            callback(err);
        }
    });

    var cityToCountryMapping = {};

    ipBlocksInputStream
        .pipe(csv.parse({ delimiter: '\t' }))
        .pipe(csv.transform(
            /**
             * @param {Array}  line
             * @param {String}   line[0] - ip block start
             * @param {String}   line[1] - ip block end
             * @param {String}   line[2] - ip range
             * @param {String}   line[3] - country code
             * @param {String}   line[4] - city id
             */
            function(line) {
                if (line[4] === '-') {
                    return null;
                }

                cityToCountryMapping[line[4]] = line[3];

                return {
                    startIpNum: line[0],
                    endIpNum:   line[1],
                    locId:      line[4]
                };

                throw new Error('111');

            }
        ))
        .pipe(csv.stringify({
            header: true
        }))
        .pipe(ipBlocksOutputStream)
        .on('finish', function() {
            var citiesOutputFilePath   = path.join(outputDirPath, 'GeoLiteCity-Location.csv');

            var citiesInputStream  = fs.createReadStream(citiesInputFilePath);
            var citiesOutputStream = fs.createWriteStream(citiesOutputFilePath);

            citiesOutputStream
                .on('error', function(err) {
                    if (callback) {
                        callback(err);
                    }
                })
                .on('finish', function() {
                    if (callback) {
                        callback();
                    }
                });

            citiesInputStream
                .pipe(csv.parse({
                    delimiter: '\t',
                    relax:     true
                }))
                .pipe(csv.transform(
                    /**
                     * @param {Array}  line
                     * @param {String}   line[0] - city id
                     * @param {String}   line[1] - city name
                     * @param {String}   line[2] - region name
                     * @param {String}   line[3] - district name
                     * @param {String}   line[4] - latitude
                     * @param {String}   line[5] - longitude
                     */
                    function(line) {
                        return {
                            locId:      line[0],
                            country:    cityToCountryMapping[line[0]],
                            region:     line[2],
                            city:       line[1],
                            postalCode: '',
                            latitude:   line[4],
                            longitude:  line[5],
                            metroCode:  '',
                            areaCode:   ''
                        };
                    }
                ))
                .pipe(csv.stringify({
                    header: true
                }))
                .pipe(citiesOutputStream);
        });
};