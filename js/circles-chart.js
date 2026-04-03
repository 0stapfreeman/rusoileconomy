// js/circles.js
async function drawWealth(containerId) {
    const rawData = await d3.csv("data/RussianWealth_Jan2022.csv");
    
    const width = 950; // Уніфікована ширина
    const height = 750; // Збільшена висота, щоб графік не тиснув на текст
    const colors = { 
        gold: "#D4AF37", 
        liquid: "#eaeaea",    
        nonLiquid: "#d0d0d0", 
        text: "#1a1a1a"
    };

    const container = d3.select(containerId);
    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("viewBox", [0, 0, width, height])
        .style("width", "100%")
        .style("height", "auto")
        .style("background", "white")
        .style("font-family", "sans-serif");

    // 1. Заголовки (вирівняні по x=0)
    svg.append("text")
        .attr("x", 0).attr("y", 50)
        .style("font-size", "24px").style("font-weight", "bold")
        .text("Фінансові резерви РФ напередодні вторгнення");

    svg.append("text")
        .attr("x", 0).attr("y", 85)
        .style("font-size", "14px").style("fill", "#666")
        .text("Січень 2022 р. Дані: млрд доларів США");

    // 2. Створюємо тултіп
    let tip = d3.select(".wealth-tooltip");
    if (tip.empty()) {
        tip = d3.select("body").append("div")
            .attr("class", "wealth-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "rgba(0,0,0,0.85)")
            .style("color", "#fff")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("z-index", "1000")
            .style("pointer-events", "none");
    }

    const createGroup = (dataSubset, centerX, centerY, label) => {
        const root = d3.hierarchy({children: dataSubset})
            .sum(d => parseFloat(d.value))
            .sort((a, b) => b.value - a.value);

        // Масштаб радіусу
        const radius = Math.sqrt(root.value) * 9.2;
        d3.pack().size([radius * 2, radius * 2]).padding(15)(root);

        const g = svg.append("g")
            .attr("transform", `translate(${centerX - radius},${centerY - radius})`);

        // Зовнішня межа групи
        g.append("circle")
            .attr("cx", radius).attr("cy", radius).attr("r", radius)
            .attr("fill", "none").attr("stroke", "#f0f0f0").attr("stroke-width", 1);

        // Підпис конкретної групи (ЗВР або ФНБ)
        svg.append("text")
            .attr("x", centerX).attr("y", centerY - radius - 30)
            .attr("text-anchor", "middle")
            .style("font-weight", "800").style("font-size", "18px")
            .text(label);

        const nodes = g.selectAll(".node")
            .data(root.leaves())
            .join("g")
            .attr("transform", d => `translate(${d.x},${d.y})`);

        nodes.append("circle")
            .attr("r", d => d.r)
            .attr("fill", d => {
                if (d.data.category === "Золото") return colors.gold;
                if (d.data.category.includes("Неліквідні")) return colors.nonLiquid;
                return colors.liquid;
            })
            .attr("stroke", "none")
            .attr("stroke-width", 2)
            .style("cursor", "help")
            .on("mouseover", function(event, d) {
                d3.select(this).transition().duration(200).attr("stroke", "#000"); 
                tip.style("visibility", "visible")
                   .html(`<strong>${d.data.category}</strong><br>Сума: $${d.data.value} млрд`);
            })
            .on("mousemove", (event) => {
                tip.style("top", (event.pageY - 10) + "px")
                   .style("left", (event.pageX + 15) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).transition().duration(200).attr("stroke", "none"); 
                tip.style("visibility", "hidden");
            });

        nodes.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", d => d.r > 45 ? "-0.3em" : "0.3em")
            .style("font-size", d => Math.min(d.r/3.5, 14) + "px")
            .style("font-weight", "700")
            .style("pointer-events", "none")
            .text(d => d.r > 25 ? d.data.category : "");

        nodes.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1.2em")
            .style("font-size", d => Math.min(d.r/4.5, 11) + "px")
            .style("fill", "#444")
            .style("pointer-events", "none")
            .text(d => d.r > 45 ? `$${d.data.value} млрд` : "");
    };

    // ЗМІЩЕНОcenterY вниз до 380, щоб бульбашки не наповзали на заголовок
    createGroup(rawData.filter(d => d.indicator.includes("ЗВР")), 300, 380, "Міжнародні резерви (ЗВР)");
    createGroup(rawData.filter(d => d.indicator.includes("ФНБ")), 750, 380, "Фонд нац. добробуту (ФНБ)");

    // 3. Футер
    const footer = svg.append("g").attr("transform", `translate(0, ${height - 30})`);
    
    footer.append("text")
        .style("font-size", "10px").style("fill", "#999")
        .text("Джерела: ЦБ РФ, Мінфін РФ | Візуалізація: Ostap Ivanochko (D3.js)");

    footer.append("text")
        .attr("x", 320)
        .style("font-size", "10px").style("fill", "#0044CC")
        .style("text-decoration", "underline").style("cursor", "pointer")
        .text("Дані: RussianWealth_Jan2022.csv")
        .on("click", () => window.open("https://www.cbr.ru/eng/hd_base/mrrf/mrrf_m/", "_blank"));
}