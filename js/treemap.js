// js/gas.js
async function drawBudget(containerId) {
    try {
        const rawData = await d3.csv("data/RussianMoney.csv");
        
        const width = 900;
        const height = 650; // Збільшено висоту, щоб вмістити заголовок і футер
        const margin = { top: 100, bottom: 60 }; // Відступи для тексту

        const colors = {
            oilGas: "#C28888", 
            other: "#eaeaea",  
            stroke: "#444"     
        };

        const container = d3.select(containerId);
        container.selectAll("*").remove();

        const svg = container.append("svg")
            .attr("viewBox", [0, 0, width, height])
            .style("width", "100%")
            .style("height", "auto")
            .style("display", "block")
            .style("background", "white")
            .style("font-family", "sans-serif");

        // 1. Заголовки (стиль як у попередніх графіках)
        svg.append("text")
            .attr("x", 0).attr("y", 40)
            .style("font-size", "24px").style("font-weight", "bold")
            .text("Джерела надходжень до бюджету РФ");

        svg.append("text")
            .attr("x", 0).attr("y", 70)
            .style("font-size", "14px").style("fill", "#666")
            .text("Січень 2022 р. Дані: млрд рублів");

        // 2. Створюємо тултіп
        let tip = d3.select(".budget-tooltip");
        if (tip.empty()) {
            tip = d3.select("body").append("div")
                .attr("class", "budget-tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background", "rgba(0,0,0,0.85)")
                .style("color", "#fff")
                .style("padding", "8px 12px")
                .style("border-radius", "4px")
                .style("font-size", "12px")
                .style("z-index", "1000")
                .style("pointer-events", "none");
        }

        const total = d3.sum(rawData, d => parseFloat(d["Сума (млрд руб)"]));
        
        const data = {
            name: "root",
            children: rawData.map(d => ({
                name: d["Джерело надходжень"],
                value: parseFloat(d["Сума (млрд руб)"]),
                percent: ((parseFloat(d["Сума (млрд руб)"]) / total) * 100).toFixed(1)
            }))
        };

        const root = d3.hierarchy(data)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        // Treemap малюється всередині зони margin
        d3.treemap()
            .size([width, height - margin.top - margin.bottom])
            .paddingInner(1)
            .paddingOuter(0)
            .round(true)
            (root);

        const chartArea = svg.append("g")
            .attr("transform", `translate(0, ${margin.top})`);

        const leaf = chartArea.selectAll("g")
            .data(root.leaves())
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

// У файлі js/treemap.js (або gas.js)

        leaf.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => d.data.name.includes("Нафтогазові") ? colors.oilGas : colors.other)
            .attr("stroke", "none") // ПРИБРАНО зовнішній бордер
            .attr("stroke-width", 2)
            .style("shape-rendering", "crispEdges")
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .interrupt()
                    .transition().duration(200)
                    .attr("fill", d3.rgb(d3.select(this).attr("fill")).darker(0.3))
                    .attr("stroke", "#000"); // З'ЯВЛЯЄТЬСЯ бордер

                tip.style("visibility", "visible")
                .html(`<strong>${d.data.name}</strong><br>Сума: ${d.data.value} млрд руб<br>Частка: ${d.data.percent}%`);
            })
            .on("mousemove", (event) => {
                tip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 15) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .interrupt()
                    .transition().duration(200)
                    .attr("fill", d => d.data.name.includes("Нафтогазові") ? colors.oilGas : colors.other)
                    .attr("stroke", "none"); // ЩЕЗАЄ бордер
                    
                tip.style("visibility", "hidden");
            });


        // Замість leaf.append("text")...
        leaf.append("foreignObject")
            .attr("x", 8)
            .attr("y", 8)
            .attr("width", d => Math.max(0, d.x1 - d.x0 - 16)) // Відступи зліва/справа
            .attr("height", d => Math.max(0, d.y1 - d.y0 - 10))
            .style("pointer-events", "none")
            .append("xhtml:div")
            .style("font-family", "sans-serif")
            .style("font-size", "12px")
            .style("font-weight", "700")
            .style("line-height", "1.1")
            .style("color", "#111")
            .html(d => {
                if (d.x1 - d.x0 < 50 || d.y1 - d.y0 < 30) return ""; // Не показувати в малих блоках
                return `<div>${d.data.name}</div>
                        <div style="font-weight: 400; font-size: 10px; color: #444; margin-top: 2px;">
                            ${d.data.value} млрд (${d.data.percent}%)
                        </div>`;
            });


        // 3. Футер з посиланням
        const footer = svg.append("g")
            .attr("transform", `translate(0, ${height - 30})`);
        
        footer.append("text")
            .style("font-size", "10px").style("fill", "#999")
            .text("Джерело: Мінфін РФ | Візуалізація: Ostap Ivanochko (D3.js)");

        footer.append("text")
            .attr("x", 280)
            .style("font-size", "10px").style("fill", "#0044CC")
            .style("text-decoration", "underline").style("cursor", "pointer")
            .text("Дані: RussianMoney.csv")
            .on("click", () => window.open("https://minfin.gov.ru/ru/statistics/fedbud/", "_blank"));

    } catch (error) {
        console.error("Error drawing budget treemap:", error);
    }
}