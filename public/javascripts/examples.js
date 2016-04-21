/**
 * Three ways you can use Mapquery data
 *
 * The Mapquery search page allows you to output data in several ways. 
 * You can save an SVG, save raw map data, or use the API call Mapquery 
 * generates based on your search parameters. Here's how you might use 
 * each of those output options together with real-world data to make a graphic.
 * 
 * To provide a full demo of each method, each section below is independent 
 * from the others, so you'll notice a lot of repetition in each.
 * 
 * Static files used:
 * data/cb_2014_us_county_20m.svg is topojson data exported from mapquery
 * data/cb_2014_us_county_20m.json is topojson data exported from mapquery
 * data/worker-gender.csv is data from the us census on worker gender by county
 */

// establish some globals
var color = d3.scale.threshold()
  .domain([40,42,44,46,48,50])
  .range(['#a3d3f0','#8cbad8','#74a2bf','#5d8ba9','#467492','#2f5e7c','#154866']),
  width = 940,
  height = 500;

//
// Example 1: Bind data to static SVG
//

function staticSvg() {
  // add static svg to #map-1 div
  d3.xml("data/cb_2014_us_county_20m.svg", "image/svg+xml", function(xml){
    var mapContainer = d3.select("#map-1");
    mapContainer.node().appendChild(xml.documentElement);
    var svg = d3.select("svg").attr("id","map-svg");

    // load mappable data
    d3.csv("data/worker-gender.csv",function(error,data){

      // format some fields in the census data
      data.forEach(function(d){
        d.fips = d3.format("05d")(d.fips);
        d.femalePct = (+d.female_total/+d.pop_total)*100;
      });

      // create a selector by the fips field in the census data
      // fips is a five-digit unique ID for each county
      var dataByFips = d3.nest()
        .key(function(d){ return d.fips })
        .map(data);

      // loop through SVG's path elements
      var countyPaths = svg.selectAll("path")
        .each(function(d){
          
          // get the id from the path element, 
          // which mapquery sets with a given dataset's 
          // unique identifier. in this case, fips code.
          // note that mapquery prepends a letter to the id,
          // which you should remove to get the code
          var id = d3.select(this).attr("id").substr(1);
          
          // then look for matches between the fips code from the id
          // and the fips code in the data we've loaded
          // bind that datum when a match is found
          var datum = (typeof dataByFips[id] !== "undefined") ? dataByFips[id][0] : {};
          d3.select(this).datum(datum);

        })
        .style("fill",function(d){
          // then use the bound datum to set the fill of each path
          if (dataByFips[d.fips]) return color(+dataByFips[d.fips][0].femalePct);
        });
    });
  });
}
staticSvg();

//
// Example 2: Load data from static topojson file
//

// we're using queue to load our two static data files
queue()
  .defer(d3.json, "data/cb_2014_us_county_20m.json")
  .defer(d3.csv, "data/worker-gender.csv")
  .await(loadStaticData);

function loadStaticData(err, mapData, workerData) {

  // append an svg
  var svg = d3.select("#map-2").append("svg:svg")
    .attr("id","map-2-svg")
    .attr("width", width)
    .attr("height", height);

  // format some fields in the census data
  workerData.forEach(function(d){
    d.fips = d3.format("05d")(d.fips);
    d.femalePct = (+d.female_total/+d.pop_total)*100;
  });

  // create a selector by the fips field in the census data
  // fips is a five-digit unique ID for each county 
  var dataByFips = d3.nest()
    .key(function(d){ return d.fips })
    .map(workerData);

  // get the name of the field in our map data 
  // that is denoted as a unique identifier
  // in the metadata table.
  // in this case, we know it's fips, but this
  // is how we can get the field dynamically
  var uniqueFld = (mapData.table_metadata.fld_identifier) ? mapData.table_metadata.fld_identifier : "name";

  // setup the projection using the handy
  // metadata mapquery provided
  var projection = d3.geo[mapData.projection]()
    .scale(mapData.scale)
    .translate(mapData.translate);

  var path = d3.geo.path()
    .projection(projection);

  // explicitly select the toposon map units.
  // for geojson it would be in data.map.features
  var units = mapData.map.objects.features;

  // append each county path
  svg.selectAll(".units-2")
    .data(units)
    .enter().append("path")
    .attr("class","units-2")
    .attr("id",function(d) { return "u"+d.properties[uniqueFld]; })
    .attr("d", path)
    .style("fill",function(d){
      // get the fips code, the unique id, from this path's properties
      var fips = d3.format("05d")(d.properties[uniqueFld]);
      // select the census data by the fips code
      // when there's a match, set a color based on
      // the percentage of female workers in that county
      if (dataByFips[fips]) return color(+dataByFips[fips][0].femalePct);
    });

}

// 
// Example 3: Load data directly from the API
// 

// we're using queue to load our two static data files.
// cb_2014_us_county_20m.json is topojson data exported from mapquery
// worker-gender.csv is data from the us census on worker gender by county
queue()
  .defer(d3.json, "/api/feature-collection?table=cb_2014_us_county_20m&field_value=&proj=albersUsa&width=940&height=500&datatype=topojson")
  .defer(d3.csv, "data/worker-gender.csv")
  .await(loadApiData);

function loadApiData(err, result, workerData) {

  // append an svg
  var svg = d3.select("#map-3").append("svg:svg")
    .attr("id","map-3-svg")
    .attr("width", width)
    .attr("height", height);

  // format some fields in the census data
  workerData.forEach(function(d){
    d.fips = d3.format("05d")(d.fips);
    d.femalePct = (+d.female_total/+d.pop_total)*100;
  });

  // create a selector by the fips field in the census data
  // fips is a five-digit unique ID for each county 
  var dataByFips = d3.nest()
    .key(function(d){ return d.fips })
    .map(workerData);

  // grap the map data from the API result
  var mapData = result.data;

  // get the name of the field in our map data 
  // that is denoted as a unique identifier
  // in the metadata table.
  // in this case, we know it's fips, but this
  // is how we can get the field dynamically
  var uniqueFld = (mapData.table_metadata.fld_identifier) ? mapData.table_metadata.fld_identifier : "name";

  // setup the projection using the handy
  // metadata mapquery provided
  var projection = d3.geo[mapData.projection]()
    .scale(mapData.scale)
    .translate(mapData.translate);

  var path = d3.geo.path()
    .projection(projection);

  // explicitly select the topojson map units.
  // for geojson it would be in data.map.features
  var units = mapData.map.objects.features;

  // append each county path
  svg.selectAll(".units-3")
    .data(units)
    .enter().append("path")
    .attr("class","units-3")
    .attr("id",function(d) { return "u"+d.properties[uniqueFld]; })
    .attr("d", path)
    .style("fill",function(d){
      // get the fips code, the unique id, from this path's properties
      var fips = d3.format("05d")(d.properties[uniqueFld]);
      // select the census data by the fips code
      // when there's a match, set a color based on
      // the percentage of female workers in that county
      if (dataByFips[fips]) return color(+dataByFips[fips][0].femalePct);
    });

}

// 
// Below we just call a nifty/weird little function
// that dynamically creates and appends a key
// to represent an arbitrary scale.
// 
// This is not part of the demo, but feel free 
// to try it out and let us know if you make improvements to it!
// 

instaScale(color,600,"scale-1");
instaScale(color,600,"scale-2");
instaScale(color,600,"scale-3");

function instaScale(colorScale,w,div) {
  w = (w < 300) ? 300 : w;

  var svgScale = d3.select("#"+div).append("svg")
    .attr("width", w)
    .attr("height", 100);

  var scaleDomain = [+colorScale.domain()[0]-2,+colorScale.domain()[colorScale.domain().length-1]+2];

  var x = d3.scale.linear()
    .domain(scaleDomain)
    .range([10, w-10]);

  svgScale.selectAll("."+div+"-rects")
    .data(colorScale.range().map(function(d, i) {
      return {
        x0: i ? x(colorScale.domain()[i - 1]) : x.range()[0],
        x1: i < colorScale.domain().length ? x(colorScale.domain()[i]) : x.range()[1],
        z: d
      };
    }))
    .enter().append("rect")
      .attr("id",function(d,i){ return div+"-"+i; })
      .attr("class",div+"-rects")
      .attr("width", function(d) { return d.x1 - d.x0-5; })
      .attr("height", 17.5)
      .attr("x", function(d) { return d.x0; })
      .attr("y",25)
      .style("fill", function(d) { return d.z; });

  svgScale.append("text")
    .attr("x",10)
    .attr("y",15)
    .text("Share of female workers")
    .style("font-family","'AdelleSans-Bold', Helvetica, Arial, sans-serif");

  svgScale.selectAll("."+div+"-labels")
    .data(colorScale.range().map(function(d, i) {
      return {
        x0: i ? x(colorScale.domain()[i - 1]) : x.range()[0],
      };
    }))
    .enter().append("text")
      .attr("class",div+"-labels")
      .attr("x", function(d,i) { if (i == 0) { return d.x0-5; } else { return d.x0-10; } })
      .attr("y",60)
      .text(function(d,i){ 
        var l = Math.abs(colorScale.domain()[i-1]);
        if (i == 0) { 
          return "38% or less";
        } else if (i == colorScale.domain().length) {
          return l+"% or more";
        } else {
          return l;
        }
      })
      .style("font-family","'AdelleSans-Regular', 'Helvetica Neue', Arial, Helvetica, sans-serif")
      .style("font-size","14px");
}