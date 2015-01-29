#!/usr/bin/env node

var program = require('commander');
var package = require('../package.json');
var lib     = require('../lib');

program
    .version(package.version)
    .usage('[options] <outputDir>')
    .description(package.description)
    .option('-i, --ipblocks <path>', 'Path to cidr_optim.txt (blocks of IP addresses)')
    .option('-c, --cities <path>', 'Path to cities.txt (cities names)')
    .parse(process.argv);

if (!program.ipblocks || !program.cities) {
    console.error('"ipblocks" and "cities" options must be set. See --help');
    process.exit(1);
}

var outputDir = program.args.shift();
if (!outputDir) {
    console.error('Output directory does not set. See --help');
    process.exit(1);
}

lib.convert(program.ipblocks, program.cities, outputDir, function(err) {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    console.log('Done!');
});