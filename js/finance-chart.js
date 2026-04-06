async function drawFinanceEvolution(containerId) {
    const margin = { top: 120, right: 50, bottom: 80, left: 110 };
    const width = 1100;
    const height = 700;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    try {
        const text = await d3.text("data/budget_data.csv");
        const lines = text.split('\n').filter(l => l.trim() !== "");
        
        const cleanVal = (val) => {
            if (!val) return 0;
            const cleaned = val.replace(/"/g, '').replace(/\s/g, '').replace(',', '.');
            return parseFloat(cleaned) || 0;
        };

        const getRowData = (line) => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const datesRaw = getRowData(lines[0]).slice(1);
        const oilGasRaw = getRowData(lines[1]).slice(1);
        const nonOilRaw = getRowData(lines[2]).slice(1);
        const spendRaw = getRowData(lines[3]).slice(1);

        let data = datesRaw.map((d, i) => {
            const rawStr = d.trim().toLowerCase();
            const monthsMap = { "січ":0,"янв":0,"лют":1,"фев":1,"бер":2,"мар":2,"квіт":3,"апр":3,"трав":4,"май":4,"черв":5,"июн":5,"лип":6,"июл":6,"серп":7,"авг":7,"вер":8,"сен":8,"жовт":9,"окт":9,"лист":10,"ноя":10,"груд":11,"дек":11 };
            const monthKey = Object.keys(monthsMap).find(key => rawStr.includes(key));
            const yearMatch = rawStr.match(/(\d{2})$/);
            if (!monthKey || !yearMatch) return null;

            return {
                date: new Date(2000 + parseInt(yearMatch[0]), monthsMap[monthKey], 1),
                oilGas: cleanVal(oilGasRaw[i]),
                totalIncome: cleanVal(oilGasRaw[i]) + cleanVal(nonOilRaw[i]),
                spending: cleanVal(spendRaw[i])
            };
        }).filter(d => d !== null && d.date.getFullYear() >= 2016);

        data = data.map((d, i, arr) => {
            const windowSize = 12;
            if (i < windowSize - 1) return { ...d, spendMA: null, incomeMA: null };
            const sumSpend = arr.slice(i - windowSize + 1, i + 1).reduce((acc, c) => acc + c.spending, 0);
            const sumInc = arr.slice(i - windowSize + 1, i + 1).reduce((acc, c) => acc + c.totalIncome, 0);
            return { ...d, spendMA: sumSpend / windowSize, incomeMA: sumInc / windowSize };
        });

        const svg = d3.select(containerId).selectAll("svg").data([null]).join("svg")
            .attr("viewBox", [0, 0, width, height]).style("background", "#fff");

        // --- СТВОРЕННЯ ТУЛТІПА ---
        const tooltip = d3.select("body").selectAll(".finance-tooltip").data([null]).join("div")
            .attr("class", "finance-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "rgba(255, 255, 255, 0.96)")
            .style("padding", "12px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "4px")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
            .style("font-family", "Inter, sans-serif")
            .style("font-size", "13px")
            .style("pointer-events", "none")
            .style("z-index", "10000");

        svg.append("text").attr("x", 40).attr("y", 40).style("font-size", "22px").style("font-weight", "bold")
           .text("Економіка війни: Хроніка вичерпання ресурсів (2016-2026)");
        
        svg.append("text").attr("x", 40).attr("y", 65).style("font-size", "14px").attr("fill", "#666")
           .text("Порівняння темпів державних витрат та доходів бюджету РФ");

        const g = svg.selectAll("g.main-group").data([null]).join("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, innerWidth]);
        const y = d3.scaleLinear().domain([0, 5000]).range([innerHeight, 0]);

        // Сітка
        g.append("g").attr("class", "grid").attr("opacity", 0.1)
            .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));

        // Дефіцит
        g.selectAll(".deficit-bar")
            .data(data.filter(d => d.spendMA && d.spendMA > d.incomeMA))
            .join("line")
            .attr("x1", d => x(d.date)).attr("x2", d => x(d.date))
            .attr("y1", d => y(Math.min(5000, d.incomeMA))).attr("y2", d => y(Math.min(5000, d.spendMA)))
            .attr("stroke", "#ff9800").attr("stroke-width", 2).attr("opacity", 0.4);

        // Лінії
        const lineOil = d3.line().x(d => x(d.date)).y(d => y(Math.min(5000, d.oilGas))).curve(d3.curveMonotoneX);
        g.append("path").datum(data).attr("fill", "none").attr("stroke", "#e31a1c").attr("stroke-width", 1.5).attr("opacity", 0.3).attr("d", lineOil);

        const lineIncMA = d3.line().defined(d => d.incomeMA).x(d => x(d.date)).y(d => y(Math.min(5000, d.incomeMA))).curve(d3.curveMonotoneX);
        g.append("path").datum(data).attr("fill", "none").attr("stroke", "#e31a1c").attr("stroke-width", 2).attr("stroke-dasharray", "4,4").attr("d", lineIncMA);

        const lineSpendMA = d3.line().defined(d => d.spendMA).x(d => x(d.date)).y(d => y(Math.min(5000, d.spendMA))).curve(d3.curveMonotoneX);
        g.append("path").datum(data).attr("fill", "none").attr("stroke", "#000").attr("stroke-width", 3.5).attr("d", lineSpendMA);

        // Осі
        g.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(10));
        g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d} млрд ₽`));

        // --- ЛОГІКА НАВЕДЕННЯ (INTERACTIVITY) ---
        const focusLine = g.append("line")
            .attr("stroke", "#999")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,3")
            .attr("y1", 0)
            .attr("y2", innerHeight)
            .style("visibility", "hidden");

        const bisect = d3.bisector(d => d.date).left;
        const dateFormatter = d3.timeFormat("%B %Y");

        // Невидимий прямокутник для відстеження миші
        g.append("rect")
            .attr("width", innerWidth)
            .attr("height", innerHeight)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mousemove", function(event) {
                const mouseX = d3.pointer(event)[0];
                const xDate = x.invert(mouseX);
                const i = bisect(data, xDate, 1);
                const d = data[i - 1];

                if (d) {
                    focusLine.attr("x1", x(d.date)).attr("x2", x(d.date)).style("visibility", "visible");
                    
                    const deficit = d.spendMA && d.incomeMA ? Math.max(0, d.spendMA - d.incomeMA) : 0;

                    tooltip
    .style("visibility", "visible")
    .style("top", (event.pageY - 20) + "px")
    .style("left", (event.pageX + 20) + "px")
    .html(`
        <div style="font-weight:bold; margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:3px; color:#000;">
            ${dateFormatter(d.date)}
        </div>
        <div style="color:#000; margin-bottom:2px;">
            <b>Тренд витрат:</b> ${d.spendMA ? d.spendMA.toFixed(1) : '—'} млрд ₽
        </div>
        <div style="color:#000; margin-bottom:2px;">
            <b>Тренд доходів:</b> ${d.incomeMA ? d.incomeMA.toFixed(1) : '—'} млрд ₽
        </div>
        <div style="color:#000; margin-bottom:2px;">
            <b>Дефіцит (середній):</b> ${deficit.toFixed(1)} млрд ₽
        </div>
        <div style="color:#666; font-size:11px; margin-top:5px; padding-top:5px; border-top:1px dashed #ddd;">
            Нафтогаз (місяць): ${d.oilGas.toFixed(1)} млрд ₽<br>
            Витрати (місяць): ${d.spending.toFixed(1)} млрд ₽
        </div>
    `);
                }
            })
            .on("mouseout", function() {
                focusLine.style("visibility", "hidden");
                tooltip.style("visibility", "hidden");
            });

        // Легенда та джерела (залишаються без змін)
        const leg = svg.append("g").attr("transform", `translate(${margin.left}, 100)`);
        const lItems = [
            {l: "Тренд витрат", c: "#000", t: "line", w: 3.5},
            {l: "Тренд доходів", c: "#e31a1c", t: "line", w: 2, d: "4,4"},
            {l: "Нафтогазові доходи", c: "#e31a1c", t: "line", w: 1.5, o: 0.3},
            {l: "Дефіцит", c: "#ff9800", t: "line", w: 2.5, o: 0.6}
        ];

        lItems.forEach((d, i) => {
            const item = leg.append("g").attr("transform", `translate(${i * 200}, 0)`);
            item.append("line").attr("x2", 15).attr("y1", 5).attr("y2", 5)
                .attr("stroke", d.c).attr("stroke-width", d.w).attr("stroke-dasharray", d.d || "0").attr("opacity", d.o || 1);
            item.append("text").attr("x", 25).attr("y", 10).text(d.l).style("font-size", "12px").style("font-weight", "bold");
        });

        svg.append("text").attr("x", 40).attr("y", height - 40).style("font-size", "11px").attr("fill", "#999")
           .text("* Тренди розраховані як 12-місячне ковзне середнє для усунення сезонних коливань та 'дєкабрського вбросу'");
        
        svg.append("text").attr("x", 40).attr("y", height - 20).style("font-size", "11px").attr("fill", "#999")
           .text("Джерела: Мінфін РФ");

    } catch (err) { console.error(err); }
}