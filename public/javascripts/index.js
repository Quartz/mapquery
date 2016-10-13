//
// this is the js for the mapquery search page.
// to see examples for using mapquery,
// check out public/javascripts/examples.js instead
//

var projections = [
  "kavrayskiy7",
  "mercator",
  "azimuthalEqualArea",
  "azimuthalEquidistant",
  "albersUsa",
  "conicEqualArea",
  "conicConformal",
  "conicEquidistant",
  "equirectangular",
  "gnomonic",
  "orthographic",
  "stereographic",
  "transverseMercator"
];

var width = 940;
var height = 500;

var svg;

// append select boxes
var tableSelectEl = d3.select("#select1").append("select")
  .attr("id","table_select")
  .attr("name","table_select")
  .attr("class","searchable");
var tableUnitsEl = d3.select("#select2").append("select")
  .attr("id","table_units_select")
  .attr("name","table_units_select")
  .attr("class","searchable");
var projSelectEl = d3.select("#select3").append("select")
  .attr("id","projection_select")
  .attr("name","projection_select")
  .attr("class","searchable")
  .selectAll("option")
    .data(projections)
    .enter().append("option")
      .attr("value",function(d){ return d })
      .html(function(d){ return d });

var detailsDiv = d3.select("#details"),
  detailLabels,
  detailChecks,
  detailSpan;

var unitVal;

var url;

function loadData(table,field_value,proj,datatype) {
  var proj = proj || "kavrayskiy7";
  unitVal = field_value.split(":")[1];
  url = "/api/feature-collection?table="+table+"&field_value="+field_value+"&proj="+proj+"&width="+width+"&height="+height+"&datatype="+datatype;
  queue()
    .defer(d3.json, "/api/table-data")
    .defer(d3.json, url)
    .await(setData);
}

function setData(err, tableData, mapData) {

  var table = (mapData.data) ? mapData.data.table_metadata.table_name : "ne_50m_admin_0_countries";

  var byCategory = d3.nest()
    .key(function(d){ return d.table_category })
    .map(tableData.data);
  var keys = Object.keys(byCategory);

  // only load table select and detail checks first time
  if (tableSelectEl.selectAll(".table-og")[0].length == 0) {
    tableSelectEl.selectAll(".table-og")
      .data(keys)
      .enter().append("optgroup")
        .attr("label",function(key){ return key; })
        .attr("class","table-og")
        .each(function(key){
          d3.select(this).selectAll(".table-o")
          .data(byCategory[key])
          .enter().append("option")
            .attr("class","table-o")
            .attr("value",function(d){ return d.table_name })
            .attr("selected",function(d){ return (d.table_name == table) ? "selected" : null })
            .html(function(d){ return d.table_name_readable+" ("+d.table_resolution+")" })
        });
  }

  // check boxes for detail select, currently unused
  detailLabels = detailsDiv.selectAll(".detail-label")
    .data(byCategory["Detail"])
    .enter().append("label")
      .attr("class","detail-label");

  detailChecks = detailLabels.append("input")
    .attr("type","checkbox")
    .attr("id",function(d){ return d.table_name })
    .attr("value",1)
    .attr("class","detail-check")
    .attr("disabled","disabled");

  detailSpan = detailLabels.append("span")
    .html(function(d){ return d.table_name_readable });

  $(".searchable").select2();

  var data = mapData.data;

  var uniqueFld = (data.table_metadata.fld_identifier) ? data.table_metadata.fld_identifier : "name";

  var proj = (data.projection) ? data.projection : "kavrayskiy7";

  var projection = d3.geo[proj]()
    .scale(data.scale)
    .translate(data.translate);

  var path = d3.geo.path()
    .projection(projection);

  var graticule = d3.geo.graticule();

  var units = data.map.features;
  if ($("input:radio[name ='datatype']:checked").val() == "topojson") {
    units = data.map.objects.features;
  }

  var details = data.detail.features;
  if ($("input:radio[name ='datatype']:checked").val() == "topojson") {
    details = data.detail.objects.features;
  }

  svg = d3.select(".map-preview").html("").append("svg:svg")
    .attr("id","map-svg")
    .attr("width", width)
    .attr("height", height);

  if ($("#graticule").is(":checked")) {
    svg.append("path")
      .datum(graticule)
      .attr("class","graticule")
      .style("fill","none")
      .style("stroke","#ddd")
      .attr("d", path);
  }

  svg.selectAll(".units")
    .data(units)
    .enter().append("path")
    .attr("class","units")
    .attr("id",function(d) { return "u"+d.properties[uniqueFld]; })
    .attr("d", path);

  svg.selectAll(".details")
    .data(details)
    .enter().append("path")
    .attr("class","details")
    .attr("d", path);

  d3.select("#urlstring").html(url)

  $("#table_select").on("change",function(){
    var table = $(this).val();
    populateTableUnits(table);
  });

  d3.select("#get-map").on("click",function(){
    var table = $("#table_select").val();
    var field_value = $("#table_units_select").val();
    var proj = $("#projection_select").val();
    var datatype = $("input:radio[name ='datatype']:checked").val();
    // collect checked details, not currently in use
    var detailArray = [];
    $(".detail-check").each(function(){
      if($(this).is(":checked")) detailArray.push($(this).attr("id"))
    });
    loadData(table,field_value,proj,datatype);
  });

  d3.select("#download-svg").on("click",function() {
    var svgtext = document.getElementById("map").innerHTML;
    var regex = /<div(.*)/;
    svgtext = svgtext.replace(regex,'');
    var blob = new Blob([svgtext], {type: "image/svg+xml"});
    saveAs(blob, table+".svg");
  });

  d3.select("#download-data").on("click",function() {
    var blob = new Blob([JSON.stringify(data)], {type: "text/plain;charset=utf-8"});
    saveAs(blob, table+".json");
  });
}

function populateTableUnits(table) {
  tableUnitsEl.html("").append("option")
    .attr("value","")
    .html("All units");

  d3.json("/api/units-by-table?table="+table,function(error,tableUnits){
    var unitKeys = Object.keys(tableUnits);

    tableUnitsEl.selectAll(".unit-og")
      .data(unitKeys)
      .enter().append("optgroup")
        .attr("class","unit-og")
        .attr("label",function(key){ return key; })
        .each(function(key){
          d3.select(this).selectAll(".unit-o")
          .data(tableUnits[key])
          .enter().append("option")
            .attr("class","unit-o")
            .attr("value",function(d){ return key+":"+d })
            .attr("selected",function(d){ return (d == unitVal) ? "selected" : null })
            .html(function(d){ return d });
        });
  });
}

loadData("ne_50m_admin_0_countries","","","geojson");
populateTableUnits("ne_50m_admin_0_countries");