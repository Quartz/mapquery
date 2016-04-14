# Mapquery by Quartz
Mapquery 0.1.0 is a proof-of-concept prototype release. All of the work on the project leading to this initial release was funded by the [Knight Foundation's Prototype Fund](http://www.knightfoundation.org/funding-initiatives/knight-prototype-fund/).

Mapquery is a map data storage and retrieval API built on [Express](https://github.com/expressjs/express) and [PostGIS](http://postgis.net/).

**Table of contents**

- [Installation](https://github.com/Quartz/mapquery#installation)
- [Running Mapquery](https://github.com/Quartz/mapquery#running-mapquery)
  - [A note on importing](https://github.com/Quartz/mapquery#a-note-on-importing)
- [API endpoint reference](https://github.com/Quartz/mapquery#api-endpoint-reference)
  - [/api/feature-collection](https://github.com/Quartz/mapquery#apifeature-collection)
  - [/api/geometry-collection](https://github.com/Quartz/mapquery#apigeometry-collection)
  - [/api/table-data](https://github.com/Quartz/mapquery#apitable-data)
  - [/api/units-by-table](https://github.com/Quartz/mapquery#apiunits-by-table)

## Installation

- Install node modules `$ npm install`
- Install Postgres `$ brew install postgresql`
- Install PostGIS `$ brew install postgis`
- Start Postgres server `$ pg_ctl -D /usr/local/var/postgres -l /usr/local/var/postgres/server.log start`
- Create a new local Postgres database called `mapquery`. You can run `createdb mapquery` on the command line, or download [pgadmin](http://www.pgadmin.org/download/) and use the GUI. Set your local username as the owner.
- Run this on the command line to enable PostGIS:
```
psql -q map_library -c "
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

- Download the Mapquery starter pack database dump from [here](https://s3.amazonaws.com/qz-files/mapquery.dump)
- Restore the dump file to your database `$ pg_restore --verbose --clean --no-acl --no-owner -h localhost -U YOUR_LOCAL_USERNAME -d mapquery /PATH/TO/mapquery.dump`
- In `mapquery/settings.js`, update the database connection settings to match your own:
```js
module.exports = {
  'd': 'mapquery', // database name
  'u':  'username', //username
  'p': '', //password
  'h': 'localhost', //host
  'port': '5432' // port
};
```
- Start the app with `npm start`
- [localhost:3000](http://localhost:3000/) will load the view from `views/index.jade`

Note: When you make changes to your database that you want to sync on other computers, dump it with this command:

`pg_dump -Fc --no-acl --no-owner -h localhost -U YOUR_LOCAL_USERNAME mapquery > mapquery.dump`

Then restore with `pg_restore`, as shown above.

## Running Mapquery

To run Mapquery:

- Start Postgres server `$ pg_ctl -D /usr/local/var/postgres -l /usr/local/var/postgres/server.log start`
- Start the app with `npm start`
- Go to [localhost:3000](http://localhost:3000/) in your web browser to use the Mapquery interface.

We are not yet running Mapquery in production. We'll be updating this readme with information as we begin to implement a production version of the app. If you do your own production implementation, please let us know how it goes!

### A note on importing

Importing is currently handled through the Mapquery interface. The routes `/import/import-map` and `/import/save-map-data` import a shapefile to the database and save metadata to `mqmeta`, respectively, but they do not send a json response. Instead, they render information to `views/import.jade`. Our current plan is to implement `POST` endpoints for importing shapefile data if we find that we need that functionality.

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
