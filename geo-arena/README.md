
You can use this NHL data to make a pretty visualization of a Hockey arena that looks like this:

![Arena Viz](https://github.com/PhaedrusTheGreek/nhl-stats-elasticsearch/blob/master/geo-arena/arena-viz.png)

First, download and install [GeoServer](http://geoserver.org/)

If you want to encode your own image, you're on your own - but for the most part, here's how you do it:

[GDAL Translate](http://www.gdal.org/gdal_translate.html) tool was used to [encode latitude/longitude into a tiff file](http://gis.stackexchange.com/questions/118180/convert-png-to-geotiff-using-gdal) from a png of a hockey arena.  I lost the original command I used, but it's something like this:

```
gdal_translate -of Gtiff -a_ullr LEFT_LON UPPER_LAT RIGHT_LON LOWER_LAT -a_srs EPSG_PROJ INPUT_PNG_FILE OUTPUT_GTIFF_FILE. 
```

A hockey rink is 200 Feet by 85 Feet, so I calculated the top left corner at -100,-45, if memory serves.

If you just want to use my arena tiff, then it's [available here](https://github.com/PhaedrusTheGreek/nhl-stats-elasticsearch/blob/master/geo-arena/arena.tiff). 

You can import the tiff into a GeoServer WMS layer somewhere in the GeoServer UI.

Finally, set up Kibana to point to the GeoServer IP like this (where my IP is blacked out):

![Kibana Config](https://github.com/PhaedrusTheGreek/nhl-stats-elasticsearch/blob/master/geo-arena/kibana-settings.png)



