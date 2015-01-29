# geodbconverter

[ipgeobase.ru](http://ipgeobase.ru/cgi-bin/Archive.cgi) DB to MaxMind GeoLiteCity convertion utility

## Installation

    npm i -g geodbconverter

## Usage

To create GeoIP `GeoLiteCity-Blocks.csv` and `GeoLiteCity-Location.csv` files run command:

    geodbconverter --ipblocks <path to cidr_optim.txt>
                   --cities <path to cities.txt>
                   <output directory path>

File `cities.txt` should be encoded in UTF-8.

To convert `.csv` files to `.dat` use [mteodoro/mmutils](https://github.com/mteodoro/mmutils).