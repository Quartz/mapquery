var fs = require('fs');
var execSync = require('child_process').execSync;
var rimraf = require('rimraf');
var topojson = require('topojson');
var dbconn = require('./settings');

var promise = require('bluebird');
var options = {promiseLib: promise};
var pgp = require('pg-promise')(options);

var getScaleTranslate = require('./util/getScaleTranslate');
var zip = require('./util/zip');
var pgToFc = require('./util/pgToFc');

var connectionString = "postgres://"+dbconn.u+":"+dbconn.p+"@"+dbconn.h+"/"+dbconn.d;;
var db = pgp(connectionString);

/**
 * Retrieve a FeatureCollection with sizing, positioning and projection data
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 * @returns {Object} - Metadata and map data in the specified format. See README.MD for response specification.
 */
function getFeatureCollection(req, res, next) {
  var table = req.query.table;
  var field_value = null;
  if (req.query.field_value) {
    if (req.query.field_value !== "*") {
      field_value = req.query.field_value.split(":");
    }
  }
  var width = req.query.width;
  var height = req.query.height;
  var proj = req.query.proj;
  var datatype = req.query.datatype;
  var obj = {};
  db.one("select * from mqmeta where (table_name = '"+table+"')")
    .then(function(data){
      obj.table_metadata = data;
      var sql = "select *, ST_AsGeoJSON(geom, 6) as jsongeom from "+table;
      if (field_value) sql += " where("+field_value[0]+" = '"+field_value[1]+"')";
      return db.any(sql);
    })
    .then(function (data) {
      var features = pgToFc(data,obj.table_metadata.fld_identifier);
      var mapScaleTranslate = getScaleTranslate(features,width,height,proj);
      obj.bounds = mapScaleTranslate.bounds;
      obj.geoBounds = mapScaleTranslate.geoBounds;
      obj.scale = mapScaleTranslate.s;
      obj.translate = mapScaleTranslate.t;
      obj.projection = proj;
      obj.map = (datatype == "geojson") ? features : topojson.topology(features);
      obj.isos = [];
      if (obj.table_metadata.fld_iso_alpha_3) {
        features.features.forEach(function(d){
          if (d.properties[obj.table_metadata.fld_iso_alpha_3])
            obj.isos.push(d.properties[obj.table_metadata.fld_iso_alpha_3])
        });
      }

      // for bounding box search, not currently in use
      var envelope = "@ ST_MakeEnvelope(";
      envelope += mapScaleTranslate.geoBounds[0][0]+",";
      envelope += mapScaleTranslate.geoBounds[0][1]+",";
      envelope += mapScaleTranslate.geoBounds[1][0]+",";
      envelope += mapScaleTranslate.geoBounds[1][1]+",4269)";
      var sql = "select *, ST_AsGeoJSON(geom, 6) as jsongeom from ne_10m_railroads where geom "+envelope;

      return db.any(sql);
    })
    .then(function (data) {
      var features = pgToFc(data,null);
      obj.detail = (datatype == "geojson") ? features : topojson.topology(features);
      // obj.detail = data;
      res.status(200).json({
        status: 'success',
        message: 'Retrieved FeatureCollection with projection data',
        data: obj
      });
    })
    .catch(function (err) {
      return next(err);
    });
}

/**
 * Retrieve a raw geometry collection
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 * @returns {Object} - Map data in the specified format. See README.MD for response specification.
 */
function getGeometry(req, res, next) {
  var table = req.query.table;
  var field_value = null;
  var datatype = req.query.datatype;
  if (req.query.field_value) {
    if (req.query.field_value !== "*") {
      field_value = req.query.field_value.split(":");
    }
  }
  var sql = "select *, ST_AsGeoJSON(geom, 6) as jsongeom from "+table;
  sql += (field_value) ? " where("+field_value[0]+" = '"+field_value[1]+"')" : "";
  db.any(sql)
    .then(function (data) {
      var obj = {};
      obj.type = "Topology";
      obj.objects = [];
      var map = (datatype == "geojson") ? data : topojson.topology(data);
      map.objects.forEach(function(d){
        obj.objects.push({
          name: d.name,
          gid: d.gid,
          geometry: d.jsongeom
        });
      });
      res.status(200)
        .json({
          status: 'success',
          message: 'Retrieved geometry',
          data: obj
        });
    })
    .catch(function (err) {
      return next(err);
    });
}

/**
 * Retrieve mqmeta table data
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 * @returns {Object} - All mqmeta data. See README.MD for response specification.
 */
function getAllTableData(req, res, next) {
  db.any('select * from mqmeta')
    .then(function (data) {
      res.status(200).json({
        data: data
      });
    })
    .catch(function (err) {
      return next(err);
    });
}

/**
 * Retrieve unique values from a given table's name field, as well as any groupby fields specified in mqmeta
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 * @returns {Object} - Unique values in arrays. See README.MD for response specification.
 */
function getTableUnits(req, res, next) {
  var table = req.query.table;
  var fld_name;
  var fld_iso_alpha_3;
  var fld_groupby = [];
  var units = {};
  db.one("select * from mqmeta where (table_name = '"+table+"')")
    .then(function (data) {
      fld_name = data.fld_name;
      for (var i=1; i<=5; i++) {
        if (data["fld_groupby"+i]) {
          fld_groupby.push(data["fld_groupby"+i]);
          units[data["fld_groupby"+i]] = [];
        }
      }
      units[fld_name] = [];
      return db.any("select * from "+table);
    })
    .then(function (data) {
      data.forEach(function(d){
        if (d[fld_name])
          if (units[fld_name].indexOf(d[fld_name]) === -1)
            units[fld_name].push(d[fld_name]);
        fld_groupby.forEach(function(fld){
          if (units[fld].indexOf(d[fld]) === -1)
            units[fld].push(d[fld]);
        });
      });
      res.status(200).json(units);
    })
    .catch(function (err) {
      return next(err);
    });
}

/**
 * Import shapefile to Postgres database, send information about imported data to client
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 * @returns {Object} - Information to render views/import.jade
 */
function importMapData(req,res,next) {
  var file = req.file;
  db.none("drop table if exists temp")
    .then(function(){
      var path_to_shp = zip.extractZip(file)
      var cmd = 'shp2pgsql -W "latin1" -c -D -s 4269 -I '+path_to_shp+' public.temp | psql -h '+dbconn.h+' -p '+dbconn.port+' -d '+dbconn.d+' -U '+dbconn.u;
      // exec(cmd, function(err, stdout, stderr) {});
      execSync(cmd);
      return db.any('select * from temp');
    })
    .then(function (data) {
      if (data) {
        // delete folder
        rimraf.sync("shapefile-imports/"+file.originalname.substr(0,file.originalname.length-4));
        // rename zip file
        fs.rename(file.path,"shapefile-imports/"+file.originalname,function(err){});
      }
      var objKeys = Object.keys(data[0]).sort();
      var objVals = [];
      objKeys.forEach(function(key){
        var str = new String(data[0][key]).substr(0,20);
        objVals.push(str);
      });
      var result = {};
      result.data = data[0];
      result.keys = objKeys;
      result.vals = objVals;
      result.table_name = file.originalname.substr(0,file.originalname.length-4);
      result.flds = [
        {fld:"fld_name",name:"Name"},
        {fld:"fld_iso_alpha_3",name:"ISO Alpha 3"},
        {fld:"fld_identifier",name:"Other unique identifier"},
        {fld:"fld_groupby1",name:"Group by 1"},
        {fld:"fld_groupby2",name:"Group by 2"},
        {fld:"fld_groupby3",name:"Group by 3"},
        {fld:"fld_groupby4",name:"Group by 4"},
        {fld:"fld_groupby5",name:"Group by 5"}
      ];
      res.render('import', {
        title: "Mapquery Import",
        message: 'Imported table '+result.table_name+' as `temp`',
        data: result
      });
    })
    .catch(function (err) {
      return next(err);
    });
}

/**
 * Save metadata from client form to mqmeta
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 * @returns {Object} - Information to render views/import.jade
 */
function saveMapData(req, res, next) {
  var table_name = req.body.table_name;
  db.none("alter table temp rename to "+table_name)
    .then(function () {
      return db.none("alter index if exists temp_geom_idx rename to "+table_name+"_geom_idx")
    })
    .then(function () {
      return db.none('insert into mqmeta(table_name,table_name_readable,table_description,table_category,table_resolution,table_source,table_source_url,fld_iso_alpha_3,fld_name,fld_groupby1,fld_groupby2,fld_groupby3,fld_groupby4,fld_groupby5,fld_identifier)' +
      'values(${table_name},${table_name_readable},${table_description},${table_category},${table_resolution},${table_source},${table_source_url},${fld_iso_alpha_3},${fld_name},${fld_groupby1},${fld_groupby2},${fld_groupby3},${fld_groupby4},${fld_groupby5},${fld_identifier})',
      req.body)
    })
    .then(function () {
      res.render('import', {
        title: "Mapquery Import",
        message: 'Created new table '+table_name+' and inserted table metadata to mqmeta',
        data: null
      });

    })
    .catch(function (err) {
      return next(err);
    });
}

module.exports = {
  getFeatureCollection: getFeatureCollection,
  getGeometry: getGeometry,
  getTableUnits: getTableUnits,
  getAllTableData: getAllTableData,
  importMapData: importMapData,
  saveMapData: saveMapData
};