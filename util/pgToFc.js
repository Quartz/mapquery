function pgToFc(queryResult,fld_identifier) {
  var props = ["gid","name"],
    i = 0,
    length = queryResult.length,
    prop = null,
    geojson = {
      "type": "FeatureCollection",
      "features": []
    };

  if (props.indexOf(fld_identifier) === -1) {
    props.push(fld_identifier);
  }

  for(i = 0; i < length; i++) {
    var feature = {
      "type": "Feature",
      "properties": {},
      "geometry": JSON.parse(queryResult[i].jsongeom)
    };
    props.forEach(function(prop){
      if (typeof queryResult[i][prop] !== "undefined")
        feature.properties[prop] = queryResult[i][prop];
    });
    geojson.features.push(feature);
  }
  return geojson;
}

module.exports = pgToFc;