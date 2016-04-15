var colorData = {
  "domain":[52,54],
  "frange":["#fecd93", "#f69b69", "#e96541"],
  "mrange":["#51b2e5","#168dd9","#00609f"],
};

var fcolor = d3.scale.threshold()
  .domain(colorData.domain)
  .range(colorData.frange);

var mcolor = d3.scale.threshold()
  .domain(colorData.domain)
  .range(colorData.mrange);

var rateById = d3.map();

d3.xml("data/cb_2014_us_county_20m.svg", "image/svg+xml", function(xml){
  var mapContainer = d3.select("#map-1");
  mapContainer.node().appendChild(xml.documentElement);
  var svg = d3.select("svg").attr("id","map-svg");

  d3.csv("data/worker-gender.csv",function(error,data){

    d3.map(data, function(d) { 
      d.fips = d3.format("05d")(d.fips);
      d.diff = +d.female_total - +d.male_total;
      d.femalePct = (+d.female_total/+d.pop_total)*100;
      d.malePct = (+d.male_total/+d.pop_total)*100;
      var val = (d.diff > 0) ? d.femalePct : d.malePct;
      return rateById.set(d.fips, val);
    });

    var dataByFips = d3.nest()
      .key(function(d){ return d.fips })
      .map(data);

    var countyPaths = svg.selectAll("path")
      .each(function(d){
        var id = d3.select(this).attr("id").substr(1);
        var datum = (typeof dataByFips[id] !== "undefined") ? dataByFips[id][0] : {};
        d3.select(this).datum(datum);
      })
      .style("fill",function(d){
        return (+d.diff > 0) ? fcolor(rateById.get(d.fips)) : mcolor(rateById.get(d.fips)); 
      });

  });

});