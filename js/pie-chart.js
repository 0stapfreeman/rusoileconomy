// js/pie-chart.js
async function drawPie(containerId) {
    // 1. Завантаження даних
    const data = await d3.csv("data/PieOil.csv", d => {
        const val = parseFloat(d["Видобуток (млн бар/день)"]);
        if (!d["Країна / Група"] || d["Країна / Група"] === "УСЬОГО") return null;
        return {
            name: d["Країна / Група"],
            value: isNaN(val) ? 0 : val,
            category: d["Категорія"] ? d["Категорія"].trim() : ""
        };
    });
    const cleanData = data.filter(d => d !== null);

    // 2. Налаштування розмірів (як в оригіналі)
    const w = 950;
    const h = 750;
    const r = Math.min(w, h) / 4.2;
    const outerR = r, innerR = r * 0.6, hover_pop = 15;

    const container = d3.select(containerId);
    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("viewBox", [-w/2, -h/2, w, h])
        .style("width", "100%")
        .style("height", "auto")
        .style("background", "white")
        .style("font-family", "sans-serif");

    // 3. Тултіп (створюємо або знаходимо існуючий)
    d3.selectAll(".oil-tooltip").remove();
    const tip = d3.select("body").append("div")
        .attr("class", "oil-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(0,0,0,0.85)")
        .style("color", "#fff")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("z-index", "1000")
        .style("pointer-events", "none");

    // 4. Підготовка даних та кольорів
    const opec = cleanData.filter(d => d.category.includes("OPEC+")).sort((a,b) => b.value - a.value);
    const nonOpec = cleanData.filter(d => d.category && !d.category.includes("OPEC+")).sort((a,b) => b.value - a.value);
    const finalData = [...opec, ...nonOpec];
    const totalValue = d3.sum(finalData, d => d.value);

    const opecColors = d3.scaleSequential(d3.interpolateBlues).domain([-2, opec.length]);
    const nonOpecColors = d3.scaleSequential(d3.interpolateGreys).domain([-2, nonOpec.length]);

    let oi = 0, ni = 0;
    const colorScale = d3.scaleOrdinal()
        .domain(finalData.map(d => d.name))
        .range(finalData.map(d => {
            if (d.name === "Росія") return "#e31a1c"; 
            return d.category.includes("OPEC+") ? opecColors(oi++) : nonOpecColors(ni++);
        }));

    const pie = d3.pie().padAngle(0.015).sort(null).value(d => d.value).startAngle(-Math.PI * 0.85);
    const arc = d3.arc().innerRadius(innerR).outerRadius(outerR);
    const arcHover = d3.arc().innerRadius(innerR).outerRadius(outerR + hover_pop);
    const labelArc = d3.arc().innerRadius(outerR * 1.15).outerRadius(outerR * 1.15);

    // 5. Заголовок та підзаголовок (зміщення координат, бо центр у 0,0)
    svg.append("text").attr("x", -w/2 + 40).attr("y", -h/2 + 60).style("font-size", "24px").style("font-weight", "bold").text("Структура світового видобутку нафти");
    svg.append("text").attr("x", -w/2 + 40).attr("y", -h/2 + 90).style("font-size", "14px").style("fill", "#666").text("Січень 2022 р. Дані: млн бар/день");

    // 6. Малювання секторів
    const sectors = svg.append("g").selectAll("path")
        .data(pie(finalData))
        .join("path")
        .attr("class", "sector")
        .attr("fill", d => colorScale(d.data.name))
        .attr("d", arc)
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).interrupt();
            d3.select(this).transition("grow").duration(200).attr("d", arcHover).attr("stroke", "#000");
            
            svg.selectAll("path.sector").filter(n => n !== d)
                .transition("fade").duration(200).style("opacity", 0.3);
            
            const p = (d.data.value / totalValue * 100);
            tip.style("visibility", "visible")
               .html(`<strong>${d.data.name}</strong><br>Видобуток: ${d.data.value.toFixed(1)} млн<br>Частка: ${p.toFixed(1)}%`);
        })
        .on("mousemove", (e) => tip.style("top", (e.pageY - 10) + "px").style("left", (e.pageX + 10) + "px"))
        .on("mouseout", function() {
            d3.select(this).interrupt("grow");
            d3.select(this).transition("shrink").duration(200).attr("d", arc).attr("stroke", "white").style("opacity", 1);
            
            svg.selectAll("path.sector").transition("fade").duration(200).style("opacity", 1);
            tip.style("visibility", "hidden");
        });

    // 7. Лейбли та лінії
    const labels = svg.append("g");
    labels.selectAll("polyline")
        .data(pie(finalData))
        .join("polyline")
        .style("fill", "none").attr("stroke", "#bbb").style("stroke-width", "1px")
        .attr("points", d => {
            const pos = labelArc.centroid(d);
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            const xOffset = Math.cos(midAngle - Math.PI/2) > 0 ? 1.35 : -1.35;
            return [arc.centroid(d), pos, [outerR * xOffset, pos[1]], [outerR * (xOffset > 0 ? xOffset + 0.1 : xOffset - 0.1), pos[1]]];
        });

    labels.selectAll("text")
        .data(pie(finalData))
        .join("text")
        .attr("transform", d => {
            const pos = labelArc.centroid(d);
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            const xOffset = Math.cos(midAngle - Math.PI/2) > 0 ? 1.48 : -1.48;
            return `translate(${outerR * xOffset}, ${pos[1]})`;
        })
        .attr("dy", "0.35em")
        .style("text-anchor", d => {
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            return Math.cos(midAngle - Math.PI/2) > 0 ? "start" : "end";
        })
        .style("font-size", "11px")
        .text(d => `${d.data.name} (${(d.data.value / totalValue * 100).toFixed(1)}%)`);

    // 8. Дужка OPEC+
    const opecA = pie(finalData).filter(d => d.data.category.includes("OPEC+"));
    if (opecA.length > 0) {
        const bArc = d3.arc().innerRadius(outerR + 10).outerRadius(outerR + 14)
            .startAngle(opecA[0].startAngle).endAngle(opecA[opecA.length-1].endAngle);
        svg.append("path").attr("d", bArc).attr("fill", "#4682B4").style("opacity", 0.5);
        svg.append("text")
            .attr("transform", `translate(${-outerR - 90}, ${-outerR + 80})`)
            .style("font-weight", "bold").style("font-size", "13px").text("Група OPEC+");
    }

    // 9. Футер
    svg.append("text").attr("x", -w/2 + 40).attr("y", h/2 - 40).style("font-size", "10px").style("fill", "#999")
        .text("Джерело: bit.ly/oil-data-2022 | Візуалізація: Ostap Ivanochko (D3.js)");
}