// to see this example, run mapquery and go to localhost:3000/examples

var color = d3.scale.threshold()
  .domain([40,42,44,46,48,50])
  .range(['#a3d3f0','#8cbad8','#74a2bf','#5d8ba9','#467492','#2f5e7c','#154866']);

// add static svg to #map-1 div
d3.xml("data/cb_2014_us_county_20m.svg", "image/svg+xml", function(xml){
  var mapContainer = d3.select("#map-1");
  mapContainer.node().appendChild(xml.documentElement);
  var svg = d3.select("svg").attr("id","map-svg");

  // then load mappable data
  d3.csv("data/worker-gender.csv",function(error,data){

    d3.map(data, function(d) { 
      d.fips = d3.format("05d")(d.fips);
      d.femalePct = (+d.female_total/+d.pop_total)*100;
    });

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

instaScale(color,600);

function instaScale(colorScale,w) {
  w = (w < 300) ? 300 : w;

  var svgScale = d3.select("#scale-1").append("svg")
    .attr("width", w)
    .attr("height", 100);

  var scaleDomain = [+colorScale.domain()[0]-2,+colorScale.domain()[colorScale.domain().length-1]+2];

  var x = d3.scale.linear()
    .domain(scaleDomain)
    .range([10, w-10]);

  svgScale.selectAll(".scale-rects")
    .data(colorScale.range().map(function(d, i) {
      return {
        x0: i ? x(colorScale.domain()[i - 1]) : x.range()[0],
        x1: i < colorScale.domain().length ? x(colorScale.domain()[i]) : x.range()[1],
        z: d
      };
    }))
    .enter().append("rect")
      .attr("id",function(d,i){ return "scale-"+i; })
      .attr("class","scale-rects")
      .attr("width", function(d) { return d.x1 - d.x0-5; })
      .attr("height", 17.5)
      .attr("x", function(d) { return d.x0; })
      .attr("y",25)
      .style("fill", function(d) { return d.z; });

  svgScale.append("text")
    .attr("class","arrow-labels")
    .attr("x",10)
    .attr("y",15)
    .text("Share of female workers");

  svgScale.selectAll(".scale-labels")
    .data(colorScale.range().map(function(d, i) {
      return {
        x0: i ? x(colorScale.domain()[i - 1]) : x.range()[0],
      };
    }))
    .enter().append("text")
      .attr("class","scale-labels")
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
      });
}