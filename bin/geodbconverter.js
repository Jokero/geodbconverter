#!/usr/bin/env node

var program = require('commander');
var package = require('../package.json');
var lib     = require('../lib');
var q       = require('q');

program
    .version(package.version)
    .usage('[options] [outputDir]')
    .description(package.description)

    .option(
        '-d, --download-url [url]',
        'ipgeobase.ru zip archive url (by default http://ipgeobase.ru/files/db/Main/geo_files.zip)',
        'http://ipgeobase.ru/files/db/Main/geo_files.zip'
    )

    .option('-l, --local', 'Use local files without archive downloading')

    .option(
        '-i, --ipblocks [path]',
        'Used only with --cities option. ' +
        "It's path to local file with blocks of IP addresses if used with --local option. " +
        "It's file name in archive if DB is downloaded from ipgeobase.ru. " +
        'By default "cidr_optim.txt"',
        'cidr_optim.txt'
    )
    .option(
        '-c, --cities [path]',
        'Used only with --ipblocks option. ' +
        "It's path to local file with cities names if used with --local option. " +
        "It's file name in archive if DB is downloaded from ipgeobase.ru. " +
        'By default "cities.txt"',
        'cities.txt'
    )

    .option(
        '--ipblocks-output [path]',
        'IP blocks output file name (by default "GeoLiteCity-Blocks.csv")',
        'GeoLiteCity-Blocks.csv'
    )
    .option(
        '--cities-output [path]',
        'Cities output file name (by default "GeoLiteCity-Location.csv")',
        'GeoLiteCity-Location.csv'
    )

    .parse(process.argv);

main();

function main() {
    var conversionOptions = {
        outputDirPath:          program.args.shift() || './',
        ipBlocksOutputFileName: program.ipblocksOutput,
        citiesOutputFileName:   program.citiesOutput
    };

    var promise = q.when();

    if (program.local) {
        conversionOptions.ipBlocksInputFilePath = program.ipblocks;
        conversionOptions.citiesInputFilePath   = program.cities;
    } else {
        console.log('Start downloading...');

        promise = lib.download({
            downloadUrl:      program.downloadUrl,
            ipBlocksFileName: program.ipblocks,
            citiesFileName:   program.cities
        })
            .then(function(filesPaths) {
                console.log('Downloading completed');
                
                conversionOptions.ipBlocksInputFilePath = filesPaths.ipBlocksFilePath;
                conversionOptions.citiesInputFilePath   = filesPaths.citiesFilePath;
            })
            .catch(function(err) {
                console.error('Downloading failed');
                process.exit(1);
            });
    }

    promise.then(function() {
        console.log('Start conversion...');

        lib.convert(conversionOptions)
            .then(function() {
                console.log('Conversion completed');
            })
            .catch(function(err) {
                console.error('Conversion failed', err);
                process.exit(1);
            });
    });
}