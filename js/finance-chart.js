// js/finance-chart.js

async function drawFinanceEvolution(containerId) {
    const margin = {top: 140, right: 80, bottom: 100, left: 130};
    const width = 1100;
    const height = 750;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const data = [
        {date: new Date("2018-01-01"), price: 68, revenue: 8.5, spending: 8.2, reserves: 120},
        {date: new Date("2019-01-01"), price: 64, revenue: 8.1, spending: 8.3, reserves: 125},
        {date: new Date("2020-04-01"), price: 18, revenue: 3.2, spending: 4.5, reserves: 115},
        {date: new Date("2021-09-01"), price: 75, revenue: 9.8, spending: 9.5, reserves: 110},
        {date: new Date("2022-03-01"), price: 95, revenue: 14.5, spending: 15.2, reserves: 105},
        {date: new Date("2023-01-01"), price: 49, revenue: 6.2, spending: 16.5, reserves: 90},
        {date: new Date("2024-03-01"), price: 68, revenue: 7.2, spending: 17.8, reserves: 65},
        {date: new Date("2025-06-01"), price: 64, revenue: 6.5, spending: 18.5, reserves: 52},
        {date: new Date("2026-04-01"), price: 58, revenue: 5.5, spending: 19.2, reserves: 47.8}
    ];

    const svg = d3.select(containerId).append("svg")
        .attr("viewBox", [0, 0, width, height])
        .style("width", "100%")
        .style("height", "auto")
        .style("background", "#fff")
        .style("font-family", "Inter, sans-serif");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Заголовок
    svg.append("text")
        .attr("x", 40).attr("y", 45)
        .style("font-size", "24px").style("font-weight", "bold")
        .text("Економіка війни: Вичерпання фінансової автономії РФ");

    // Легенда
    const leg = svg.append("g").attr("transform", `translate(${margin.left}, 85)`);
    const legendItems = [
        {label: "Витрати (ВПК та Оборона)", color: "#333", type: "rect"},
        {label: "Нафтогазові доходи РФ", color: "#e31a1c", type: "rect"},
        {label: "Ціна Urals ($/бар)", color: "#D4AF37", type: "line"},
        {label: "Запаси ФНБ ($ млрд)", color: "#007bff", type: "dash"}
    ];

    legendItems.forEach((d, i) => {
        const xPos = i < 2 ? 0 : 380;
        const yPos = (i % 2) * 20;
        const item = leg.append("g").attr("transform", `translate(${xPos}, ${yPos})`);
        if(d.type === "rect") item.append("rect").attr("width", 15).attr("height", 10).attr("fill", d.color).attr("opacity", 0.3);
        else item.append("line").attr("y1", 5).attr("y2", 5).attr("x2", 15).attr("stroke", d.color).attr("stroke-width", 2).attr("stroke-dasharray", d.type === "dash" ? "3,2" : "0");
        item.append("text").attr("x", 25).attr("y", 10).text(d.label).style("font-size", "12px");
    });

    const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, innerWidth]);
    const yBudget = d3.scaleLinear().domain([0, 22]).range([innerHeight, 0]);
    const yPrice = d3.scaleLinear().domain([0, 120]).range([innerHeight, 0]);
    const yReserves = d3.scaleLinear().domain([0, 150]).range([innerHeight, 0]);

    const areaSpending = d3.area().x(d => x(d.date)).y0(innerHeight).y1(d => yBudget(d.spending)).curve(d3.curveMonotoneX);
    const areaRevenue = d3.area().x(d => x(d.date)).y0(innerHeight).y1(d => yBudget(d.revenue)).curve(d3.curveMonotoneX);
    g.append("path").datum(data).attr("fill", "#333").attr("opacity", 0.07).attr("d", areaSpending);
    g.append("path").datum(data).attr("fill", "#e31a1c").attr("opacity", 0.2).attr("d", areaRevenue);

    const events = [
        {date: new Date("2022-02-24"), label: "Вторгнення"},
        {date: new Date("2022-12-05"), label: "Oil Price Cap"},
        {date: new Date("2025-01-01"), label: "Розрив ГТС"}
    ];

    events.forEach(e => {
        g.append("line").attr("x1", x(e.date)).attr("x2", x(e.date)).attr("y1", -30).attr("y2", innerHeight).attr("stroke", "#eee").attr("stroke-dasharray", "3,3");
        g.append("text").attr("x", x(e.date)).attr("y", -35).attr("text-anchor", "middle").style("font-size", "10px").attr("fill", "#bbb").text(e.label);
    });

    const linePrice = d3.line().x(d => x(d.date)).y(d => yPrice(d.price)).curve(d3.curveMonotoneX);
    const lineRes = d3.line().x(d => x(d.date)).y(d => yReserves(d.reserves)).curve(d3.curveMonotoneX);
    g.append("path").datum(data).attr("fill", "none").attr("stroke", "#D4AF37").attr("stroke-width", 3).attr("d", linePrice);
    g.append("path").datum(data).attr("fill", "none").attr("stroke", "#007bff").attr("stroke-width", 2.5).attr("stroke-dasharray", "5,5").attr("d", lineRes);

    g.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(yBudget).ticks(6).tickFormat(d => `$${d} млрд`))
        .append("text").attr("fill", "#333").attr("x", -10).attr("y", -20).attr("text-anchor", "end").style("font-weight", "bold").text("Бюджет/міс");
    
    const axisRes = g.append("g").attr("transform", "translate(-75,0)").call(d3.axisLeft(yReserves).ticks(6).tickFormat(d => `$${d} млрд`));
    axisRes.selectAll("text").attr("fill", "#007bff");
    axisRes.append("text").attr("fill", "#007bff").attr("x", 0).attr("y", -20).attr("text-anchor", "end").style("font-weight", "bold").text("Запаси ФНБ");

    g.append("g").attr("transform", `translate(${innerWidth},0)`).call(d3.axisRight(yPrice).tickFormat(d => `$${d}`))
        .append("text").attr("fill", "#D4AF37").attr("x", 10).attr("y", -20).attr("text-anchor", "start").style("font-weight", "bold").text("Ціна Urals");

    svg.append("text")
        .attr("x", 40).attr("y", height - 30)
        .style("font-size", "11px").attr("fill", "#999")
        .text("Джерела: Мінфін РФ (квітень 2026), Bloomberg, Trading Economics, IEA, CREA");
}