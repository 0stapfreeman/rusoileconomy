async function drawMap() {
        const path = d3.geoPath().projection(mapProjection); 

        // Завантаження геоданих
        const world = await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson");
        
        gMap.selectAll("path")
            .data(world.features)
            .join("path")
            .attr("d", path)
            .attr("fill", d => d.properties.name === "Russia" ? "#f0f0f0" : "#ffffff")
            .attr("stroke", "#ccc")
            .attr("stroke-width", 0.5);
}