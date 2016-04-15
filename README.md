# Mapquery by Quartz
Mapquery 0.1.0 is a proof-of-concept prototype release. All of the work on the project leading to this initial release was funded by the [Knight Foundation's Prototype Fund](http://www.knightfoundation.org/funding-initiatives/knight-prototype-fund/).

Mapquery is a map data storage and retrieval API built on [Express](https://github.com/expressjs/express) and [PostGIS](http://postgis.net/). When you import a shapefile to Mapquery, you can export what you want from it quickly--along with sizing and positioning information to fit any viewport. And once your map data lives in Mapquery, you’ll never have to go looking for that shapefile again.

![Mapquery Screenshots](http://data.qz.com/2016/static-images/mapquery-github/screens.png)

### Table of contents

- [Installation](https://github.com/Quartz/mapquery#installation)
- [Running Mapquery](https://github.com/Quartz/mapquery#running-mapquery)
- [How to import data](https://github.com/Quartz/mapquery#how-to-import-data)
- [Mapquery search](https://github.com/Quartz/mapquery#mapquery-search)
- [d3 example](https://github.com/Quartz/mapquery#d3-example)
- [To-do list (and how you can help)](https://github.com/Quartz/mapquery#to-do-list-and-how-you-can-help)
- [API endpoint reference](https://github.com/Quartz/mapquery#api-endpoint-reference)
  - [/api/feature-collection](https://github.com/Quartz/mapquery#apifeature-collection)
  - [/api/geometry-collection](https://github.com/Quartz/mapquery#apigeometry-collection)
  - [/api/table-data](https://github.com/Quartz/mapquery#apitable-data)
  - [/api/units-by-table](https://github.com/Quartz/mapquery#apiunits-by-table)

## Installation

1. Install node modules `$ npm install`
2. Install Postgres `$ brew install postgresql`
3. Install PostGIS `$ brew install postgis`
4. Start Postgres server `$ pg_ctl -D /usr/local/var/postgres -l /usr/local/var/postgres/server.log start`
5. Create a new local Postgres database called `mapquery`. You can run `createdb mapquery` on the command line, or download [pgadmin](http://www.pgadmin.org/download/) and use the GUI. Set your local username as the owner.
6. Run this on the command line to enable PostGIS:
    ```
    psql -q mapquery -c "
    -- Enable PostGIS (includes raster)
    CREATE EXTENSION postgis;
    -- Enable Topology
    CREATE EXTENSION postgis_topology;
    -- fuzzy matching needed for Tiger
    CREATE EXTENSION fuzzystrmatch;
    -- Enable US Tiger Geocoder
    CREATE EXTENSION postgis_tiger_geocoder;
    "
    ```
    Or if you prefer to use pgAdmin: Click on the SQL button at the top of pgAdmin. That'll open a SQL query window. Pate in the above code, excluding the top line, and click the green Run button.

7. Download the Mapquery starter pack database dump from [here](https://s3.amazonaws.com/qz-files/mapquery.dump)
8. Restore the dump file to your database `$ pg_restore --verbose --clean --no-acl --no-owner -h localhost -U YOUR_LOCAL_USERNAME -d mapquery /PATH/TO/mapquery.dump`
9. In `settings.js`, update the database connection settings to match your own:
    ```js
    module.exports = {
      'd': 'mapquery', // database name
      'u':  'username', //username
      'p': '', //password
      'h': 'localhost', //host
      'port': '5432' // port
    };
    ```
10. Start the app with `npm start`
11. [localhost:3000](http://localhost:3000/) will load the view from `views/index.jade`

Note: When you make changes to your database that you want to sync on other computers, dump it with this command:

`pg_dump -Fc --no-acl --no-owner -h localhost -U YOUR_LOCAL_USERNAME mapquery > mapquery.dump`

Then restore with `pg_restore`, as shown above.

## Running Mapquery

To run Mapquery:

- Start Postgres server `$ pg_ctl -D /usr/local/var/postgres -l /usr/local/var/postgres/server.log start`
- Start the app with `npm start`
- Go to [localhost:3000](http://localhost:3000/) in your web browser to use the Mapquery interface.

We are not yet running Mapquery in production. We'll be updating this readme with information as we begin to implement a production version of the app. If you do your own production implementation, please let us know how it goes!

## How to import data

Importing is currently handled through the Mapquery interface. The routes `/import/import-map` and `/import/save-map-data` import a shapefile to the database and save metadata to `mqmeta`, respectively, but they do not send a json response. Instead, they render information to `views/import.jade`. Our current plan is to implement `POST` endpoints for importing shapefile data if we find that we need that functionality.

1. With Mapquery running, go to the import page at [localhost:3000/import](http://localhost:3000/import) in your web browser.
2. Click "Select file to import" and choose a .zip file, which must include .shp and .dbf files.
3. Once you've selected the file, click "Upload" and you'll see this form, but blank:

    ![Mapquery Import Screenshot 1](http://data.qz.com/2016/static-images/mapquery-github/import-1.png)

4. All of this information will be inserted into the `mqmeta` table. Fill out the options:
    - **Map category:** You can adjust these options in `views/import.jade`. The categories are a bit arbitrary, but come in handy in the front-end search interface, for organizing your tables.
    - **Name of table:** This field should auto-fill with the name of the file you've selected to import. This will be the actual Postgres table name, so don't use spaces or weird characters here.
    - **Readable name:** Something more readable than the table name.
    - **Description:** Include any relevant info about the data.
    - **Map resolution:** The options here can be adjusted in `views/import.jade`. These are currently only used to display on the front-end search, but could be incorporated into filter searching/URL parameters once databases get larger.
    - **Data source/URL:** Where did you get this data? 
5. Continue to the "Shapefile fields" section:
    ![Mapquery Import Screenshot 1](http://data.qz.com/2016/static-images/mapquery-github/import-2.png)
6. In this section, we map fields from the data you're importing to the `mqmeta` table. In the dropdowns, you'll see a preiview of _one of the rows_ of data.
    - **Name:** Most shapefiles should have a `name` field that provides a text representation of a given unit. In a shapefile containing countries, for example, the `name` field would be the name of each country. If the data you're importing doesn't happen to have a name field, try to find a similar field that indicates what each unit is.
    - **ISO Alpha 3:** If you're importing a table that includes the ISO code of each unit, it's useful to know what field the codes are in.
    - **Other unique identifier:** This might be the ISO code if you're importing countries, or a FIPS code if you're importing US counties.
    - **Group by:** If you're importing countries from a Natural Earth shapefile, for example, you may select the `continent` and `subregion` columns as your group-by fields. These are primarily for the front-end search function; it allows you to select a continent or subregion to make a map with.
7. Click "Save"

## Mapqeury search

Much of Mapqeury is built around its front-end search feature. We hope its functionality is intuitive and self-explanitory, but there's a bit of philosophy behind how it works. First, we didn't want to hide the database tables from the end-user. When you want to make a map, the first thing you have to consider is what shape data you want to draw from. Once you've selected the table you want, the second dropdown populates based on that table's metadata, providing you in some cases with hundreds of options of units to pull out.

We've discussed determining the best projection for the end-user based on the region their selected units fall into, but ultimately decided that _we_ would always want the option to pick our own projection, so assumed that you would, too.

## d3 example

This example calls the Mapquery API as if it's running locally. Alternatively, you can download Mapquery's output from the front-end interface and load the static file.

```js
var width = 940;
var height = 500;
var svg = d3.select("body").append("svg:svg")
  .attr("width", width)
  .attr("height", height);
d3.json("http://localhost:3000/api/feature-collection?table=ne_50m_admin_0_countries&proj=kavrayskiy7&datatype=topojson&width="+width+"&height="+height,function(error,result){
  
  var data = result.data;
  
  // when you call api/feature-collection,
  // Mapquery determines the appropriate scale and position
  var projection = d3.geo[data.projection]()
    .scale(data.scale)
    .translate(data.translate);

  var path = d3.geo.path()
    .projection(projection);

  // for topojson
  var units = data.map.objects.features;
  // for geojson, use data.map.features;

  svg.selectAll(".units")
    .data(units)
    .enter().append("path")
    .attr("class","units")
    .attr("id",function(d) { return d.properties.name })
    .attr("d", path);
});
```

## To-do list (and how you can help)

### Simplification

There are [several](https://bost.ocks.org/mike/simplify/) [ways](https://www.jasondavies.com/simplify/) we could incorporate a simplification option into Mapquery. This will likely be the next feature we add, but invite motivated contributors to beat us to the punch. The simplification would ideally occur on the back-end, and be added as an npm module to the `utils` directory.

### Dynamic detail search

On the Mapquery Search page, there are several disabled checkboxes for including details like airports or roads with a given search. One way this could work would be a bounding box search. We've written a bit of code [here](https://github.com/Quartz/mapquery/blob/master/queries.js#L62) which constructs a SQL query to search a given detail table for units. The problem here is that the query will return units for any country that falls within that bounding box, even if that country isn't included in the search.

Another method would be to use the array of ISOs collected [here](https://github.com/Quartz/mapquery/blob/master/queries.js#L54) to search detail tables which include ISOs. But not every searchable table includes ISOs (like US counties, for example), nor does every detail table.

It seems that the best approach may be to customize functionality around each detail. To get names of cities from Natural Earth's Populated Places table, for example, you could search by ISO, but you may also want to filter by the population field to limit the results to larger cities.

Any ideas?

### Locator maps

The user would query for an address or city, but what would Mapquery return? It seems we'll have to solve the dynamic detail search problem first.

### Centroids

Adding the option to return centroids could be useful for building cartograms.

## API endpoint reference

Route definitions can be found in `routes/index.js`; handlers are in `/queries.js`.

### /api/feature-collection

Returns a Geojson or Topojson representation of a `FeatureCollection`, along with metadata about the map. This endpoint is currently the most fully-featured, because the `FeatureCollection` format allows for simple dynamic sizing and positioning.

| Parameter            | Required                 | Description  |
| -------------------- |:------------------------:|:-------------|
| `table`              | Yes                      | Must be the valid name of a table in your Postgres database
| `field_value`        | No (Default: All units)  | Table field and value separated by a `:`. Must be a valid field name and value from the selected table. Example: "continent:Europe".
| `width`              | Yes                      | The width of the viewport of the resulting map
| `height`             | Yes                      | The height of the viewport of the resulting map 
| `proj`               | Yes                      | Must be the valid name of any projection supported by [d3.geo](https://github.com/mbostock/d3/wiki/Geo-Projections) or d3's [extended projections plugin](https://github.com/d3/d3-geo-projection/). Example: "albersUsa".
| `datatype`           | No (Default: "topojson") | "topojson" or "geojson"

**Example result**

Request: `/api/feature-collection?table=ne_50m_admin_0_countries&proj=kavrayskiy7&width=940&height=500`

Result:

```
{
  "status":"success",
  "message":"Retrieved FeatureCollection with projection data",
  "data":{
    "table_metadata":
      {
        "table_id":20,
        "table_last_updated":"2016-04-01T16:36:11.983Z",
        "table_name":"ne_50m_admin_0_countries",
        "table_name_readable":"Countries",
        "table_description":null,
        "table_category":"Countries",
        "table_resolution":"1:50m",
        "table_source":"Natural Earth",
        "table_source_url":"http://www.naturalearthdata.com/downloads/50m-cultural-vectors/",
        "fld_iso_alpha_3":"iso_a3",
        "fld_name":"name",
        "fld_groupby1":"continent",
        "fld_groupby2":"subregion",
        "fld_groupby3":null,
        "fld_groupby4":null,
        "fld_groupby5":null,
        "fld_identifier":"iso_a3"
      },
    "bounds":[[-2.68763343988672,-1.4590884304298841],[2.68763343988672,1.5707775819587302]],
    "scale":148.52141915187846,
    "translate":[470,241.7058843555333],
    "projection":"kavrayskiy7",
    "map":{
      "type":"Topology",
      "objects":{
        "type":"FeatureCollection",
        "features": [ARRAY OF FEATURES...]
      }
    }
  }
}
```

### /api/geometry-collection

Returns a Geojson or Topojson representation of the specified geometry. This endpoint is currently fairly limited, as it does not provide any dynamic sizing or positioning, and we recommend using `api/feature-collection` instead.

| Parameter            | Required                 | Description  |
| -------------------- |:------------------------:|:-------------|
| `table`              | Yes                      | Must be the valid name of a table in your Postgres database
| `field_value`        | No (Default: All units)  | Table field and value separated by a `:`. Must be a valid field name and value from the selected table. Example: "continent:Europe".
| `datatype`           | No (Default: "topojson") | "topojson" or "geojson"

**Example result**

Request: `/api/geometry-collection?table=ne_50m_admin_0_countries&field_value=continent:Europe&proj=mercator&datatype=topojson`

Result:

```
{
  "status":"success",
  "message":"Retrieved geometry",
  "data":{
    "type":"Topology",
    "objects":[
      {
        "name":"Andorra",
        "gid":7,
        "geometry":"{
          "type":"MultiPolygon",
          "coordinates":[ARRAY OF COORDINATES...]
        }
      },
      {
        MORE OBJECTS...
      }
    ]
  }
}
```

### /api/table-data

Returns all of the data from the `mqmeta` table, which is metadata about all of the maps you've imported into Mapquery.

_No parameters are required (or accepted)._

**Example result**

Request: `/api/table-data`

Result:

```
{
  "data":[
    {
      "table_id":10,
      "table_last_updated":"2016-02-16T22:11:10.929Z",
      "table_name":"ne_10m_admin_0_countries",
      "table_name_readable":"Countries",
      "table_description":"There are 247 countries in the world. Greenland as separate from Denmark. Most users will want this file instead of sovereign states.",
      "table_category":"Countries",
      "table_resolution":"1:10m",
      "table_source":"Natural Earth",
      "table_source_url":"http://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/",
      "fld_iso_alpha_3":"iso_a3",
      "fld_name":"name",
      "fld_groupby1":"continent",
      "fld_groupby2":"subregion",
      "fld_groupby3":null,
      "fld_groupby4":null,
      "fld_groupby5":null,
      "fld_identifier":"iso_a3"
    },
    {ETC...}
  ]
}
```

### /api/units-by-table

When you import a shapefile to Mapquery through its front-end interface, you're asked which fields in the map data you'd like to group by. Those field names are recorded in the `mqmeta` table (see above). For example, if you're importing countries from a Natural Earth shapefile, you may select the `continent` and `subregion` columns as your group-by fields. You can then see all of the unique values in those fields by calling this endpoint, as well as all of the values in the table's `name` field.

| Parameter            | Required                 | Description  |
| -------------------- |:------------------------:|:-------------|
| `table`              | Yes                      | Must be the valid name of a table in your Postgres database

**Example result**

Request: `/api/units-by-table?table=ne_50m_admin_0_countries`

Result:

```
{
  "continent":["North America","Asia","Europe","Africa","South America","Oceania","Antarctica","Seven seas (open ocean)"],
  "subregion":["Caribbean","Southern Asia","Southern Europe","Western Asia","Middle Africa","Northern Europe","South America","Polynesia","Antarctica","Australia and New Zealand","Seven seas (open ocean)","Western Europe","Eastern Africa","Western Africa","Eastern Europe","Central America","Northern America","Southern Africa","South-Eastern Asia","Eastern Asia","Central Asia","Northern Africa","Melanesia","Micronesia"],
  "name":[ALL COUNTRIES...]
}
```
