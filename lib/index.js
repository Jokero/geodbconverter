var fs      = require('fs');
var os      = require('os');
var path    = require('path');
var request = require('request');
var unzip   = require('unzip');
var mkdirp  = require('mkdirp');
var csv     = require('csv');
var iconv   = require('iconv-lite');

/**
 * @param {Object} options
 * @param {String}   options.downloadUrl
 * @param {String}   options.ipBlocksFileName
 * @param {String}   options.citiesFileName
 *
 * @returns {Promise}
 */
exports.download = function(options) {
    return new Promise(function(resolve, reject) {
        var tmpDirPath = path.join(os.tmpdir(), 'geodbconverter');
        mkdirp.sync(tmpDirPath);

        var outputFilePath, outputFileStream, outputFilesPaths = {};

        request(options.downloadUrl)
            .pipe(unzip.Parse())
            .on('entry', function(entry) {
                outputFilePath   = path.join(tmpDirPath, entry.path);
                outputFileStream = fs.createWriteStream(outputFilePath);

                if (options.ipBlocksFileName === entry.path) {
                    outputFilesPaths.ipBlocksFilePath = outputFilePath;
                } else if (options.citiesFileName === entry.path) {
                    outputFilesPaths.citiesFilePath = outputFilePath;
                }

                entry.pipe(outputFileStream);
            })
            .on('finish', function() {
                if (outputFilesPaths.ipBlocksFilePath && outputFilesPaths.citiesFilePath) {
                    resolve(outputFilesPaths);
                } else {
                    reject();
                }
            });
    });
};

/**
 * @param {Object} options
 * @param {String}   options.ipBlocksInputFilePath
 * @param {String}   options.citiesInputFilePath
 * @param {String}   options.outputDirPath
 * @param {String}   options.ipBlocksOutputFileName
 * @param {String}   options.citiesOutputFileName
 *
 * @returns {Promise}
 */
exports.convert = function(options) {
    return new Promise(function(resolve, reject) {
        mkdirp.sync(options.outputDirPath);

        var ipBlocksInputStream = fs.createReadStream(options.ipBlocksInputFilePath);

        var ipBlocksOutputFilePath = path.join(options.outputDirPath, options.ipBlocksOutputFileName);
        var ipBlocksOutputStream   = fs.createWriteStream(ipBlocksOutputFilePath);

        var cityToCountryMapping = {};

        ipBlocksInputStream
            .pipe(csv.parse({ delimiter: '\t' }))
            .pipe(csv.transform(
                /**
                 * @param {Array}  line
                 * @param {String}   line[0] ip block start
                 * @param {String}   line[1] ip block end
                 * @param {String}   line[2] ip range
                 * @param {String}   line[3] country code
                 * @param {String}   line[4] city id
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
                }
            ))
            .pipe(csv.stringify({
                header: true
            }))
            .pipe(ipBlocksOutputStream)
            .on('error', function(err) {
                deferred.reject(err);
            })
            .on('finish', function() {
                var citiesInputStream = fs.createReadStream(options.citiesInputFilePath);

                var citiesOutputFilePath = path.join(options.outputDirPath, options.citiesOutputFileName);
                var citiesOutputStream   = fs.createWriteStream(citiesOutputFilePath);

                citiesInputStream
                    .pipe(iconv.decodeStream('win1251'))
                    .pipe(iconv.encodeStream('utf8'))
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
                    .pipe(citiesOutputStream)
                    .on('error', function(err) {
                        reject(err);
                    })
                    .on('finish', function() {
                        resolve();
                    });
            });
    });
};