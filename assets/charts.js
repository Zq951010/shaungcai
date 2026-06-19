/**
 * 彩票预测分析平台 - 图表渲染模块
 * 使用 ECharts 绘制所有可视化图表
 */

(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var accent4 = style.getPropertyValue('--accent4').trim();
  var accent5 = style.getPropertyValue('--accent5').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var bg = style.getPropertyValue('--bg').trim();

  var palette = [accent, accent2, accent3, accent4, accent + '99', accent2 + '99', accent3 + '99'];

  var chartInstances = {};

  function getOrCreate(id) {
    if (chartInstances[id]) {
      chartInstances[id].dispose();
    }
    var el = document.getElementById(id);
    if (!el) return null;
    var chart = echarts.init(el, null, { renderer: 'svg' });
    chartInstances[id] = chart;
    window.addEventListener('resize', function() { chart.resize(); });
    return chart;
  }

  // ==================== 大乐透图表 ====================

  window.renderDLTZoneChart = function(zoneCounts, zoneNames) {
    var chart = getOrCreate('chart-dlt-zone');
    if (!chart) return;

    var periods = [];
    var z1 = [], z2 = [], z3 = [];
    for (var i = zoneCounts.length - 1; i >= 0; i--) {
      periods.push('第' + (zoneCounts.length - i) + '期');
      z1.push(zoneCounts[i][0]);
      z2.push(zoneCounts[i][1]);
      z3.push(zoneCounts[i][2]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      legend: { data: zoneNames, textStyle: { color: muted, fontSize: 11 }, top: 0 },
      grid: { top: 35, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 5, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { name: zoneNames[0], type: 'bar', stack: 'zone', data: z1, itemStyle: { color: accent } },
        { name: zoneNames[1], type: 'bar', stack: 'zone', data: z2, itemStyle: { color: accent2 } },
        { name: zoneNames[2], type: 'bar', stack: 'zone', data: z3, itemStyle: { color: accent3 } }
      ]
    });
  };

  window.renderDLTSumChart = function(sums) {
    var chart = getOrCreate('chart-dlt-sum');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(sums.reduce(function(a,b){return a+b},0) / sums.length);
    for (var i = sums.length - 1; i >= 0; i--) {
      periods.push('第' + (sums.length - i) + '期');
      data.push(sums[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'line', data: data, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: accent, width: 2 }, itemStyle: { color: accent }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent + '40' }, { offset: 1, color: accent + '05' }] } } },
        { type: 'line', markLine: { data: [{ yAxis: avgVal, name: '均值' }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderDLTSpanChart = function(spans) {
    var chart = getOrCreate('chart-dlt-span');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(spans.reduce(function(a,b){return a+b},0) / spans.length);
    for (var i = spans.length - 1; i >= 0; i--) {
      periods.push('第' + (spans.length - i) + '期');
      data.push(spans[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: data, itemStyle: { color: function(p) { return p.value >= avgVal ? accent : accent2; }, borderRadius: [3, 3, 0, 0] }, barWidth: '50%' },
        { type: 'line', markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderDLTFreqChart = function(freqMap, expected) {
    var chart = getOrCreate('chart-dlt-freq');
    if (!chart) return;

    var nums = [];
    var freqs = [];
    for (var n = 1; n <= 35; n++) {
      nums.push(pad(n));
      freqs.push(freqMap[n] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: nums, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 9, rotate: 45 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: freqs.map(function(f) {
          return { value: f, itemStyle: { color: f >= expected * 1.3 ? accent4 : f >= expected ? accent : f >= expected * 0.7 ? accent2 : accent2 + '66', borderRadius: [2, 2, 0, 0] } };
        }), barWidth: '60%' },
        { type: 'line', markLine: { data: [{ yAxis: expected, name: '期望' }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  // ==================== 双色球图表 ====================

  window.renderSSQZoneChart = function(zoneCounts, zoneNames) {
    var chart = getOrCreate('chart-ssq-zone');
    if (!chart) return;

    var periods = [];
    var z1 = [], z2 = [], z3 = [];
    for (var i = zoneCounts.length - 1; i >= 0; i--) {
      periods.push('第' + (zoneCounts.length - i) + '期');
      z1.push(zoneCounts[i][0]);
      z2.push(zoneCounts[i][1]);
      z3.push(zoneCounts[i][2]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      legend: { data: zoneNames, textStyle: { color: muted, fontSize: 11 }, top: 0 },
      grid: { top: 35, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 6, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { name: zoneNames[0], type: 'bar', stack: 'zone', data: z1, itemStyle: { color: accent4 } },
        { name: zoneNames[1], type: 'bar', stack: 'zone', data: z2, itemStyle: { color: accent } },
        { name: zoneNames[2], type: 'bar', stack: 'zone', data: z3, itemStyle: { color: accent2 } }
      ]
    });
  };

  window.renderSSQSumChart = function(sums) {
    var chart = getOrCreate('chart-ssq-sum');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(sums.reduce(function(a,b){return a+b},0) / sums.length);
    for (var i = sums.length - 1; i >= 0; i--) {
      periods.push('第' + (sums.length - i) + '期');
      data.push(sums[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'line', data: data, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: accent4, width: 2 }, itemStyle: { color: accent4 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent4 + '40' }, { offset: 1, color: accent4 + '05' }] } } },
        { type: 'line', markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderSSQSpanChart = function(spans) {
    var chart = getOrCreate('chart-ssq-span');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(spans.reduce(function(a,b){return a+b},0) / spans.length);
    for (var i = spans.length - 1; i >= 0; i--) {
      periods.push('第' + (spans.length - i) + '期');
      data.push(spans[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: data, itemStyle: { color: function(p) { return p.value >= avgVal ? accent4 : accent2; }, borderRadius: [3, 3, 0, 0] }, barWidth: '50%' },
        { type: 'line', markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderSSQFreqChart = function(freqMap, expected) {
    var chart = getOrCreate('chart-ssq-freq');
    if (!chart) return;

    var nums = [];
    var freqs = [];
    for (var n = 1; n <= 33; n++) {
      nums.push(pad(n));
      freqs.push(freqMap[n] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: nums, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 9, rotate: 45 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: freqs.map(function(f) {
          return { value: f, itemStyle: { color: f >= expected * 1.3 ? accent4 : f >= expected ? accent : f >= expected * 0.7 ? accent2 : accent2 + '66', borderRadius: [2, 2, 0, 0] } };
        }), barWidth: '60%' },
        { type: 'line', markLine: { data: [{ yAxis: expected }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  // ==================== 快乐8图表 ====================

  window.renderKL8ZoneChart = function(zoneCounts, zoneNames) {
    var chart = getOrCreate('chart-kl8-zone');
    if (!chart) return;

    var periods = [];
    var z1 = [], z2 = [], z3 = [], z4 = [];
    for (var i = zoneCounts.length - 1; i >= 0; i--) {
      periods.push('第' + (zoneCounts.length - i) + '期');
      z1.push(zoneCounts[i][0]);
      z2.push(zoneCounts[i][1]);
      z3.push(zoneCounts[i][2]);
      z4.push(zoneCounts[i][3]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      legend: { data: zoneNames, textStyle: { color: muted, fontSize: 11 }, top: 0 },
      grid: { top: 35, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 10, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { name: zoneNames[0], type: 'bar', stack: 'zone', data: z1, itemStyle: { color: accent } },
        { name: zoneNames[1], type: 'bar', stack: 'zone', data: z2, itemStyle: { color: accent2 } },
        { name: zoneNames[2], type: 'bar', stack: 'zone', data: z3, itemStyle: { color: accent3 } },
        { name: zoneNames[3], type: 'bar', stack: 'zone', data: z4, itemStyle: { color: accent4 } }
      ]
    });
  };

  window.renderKL8SumChart = function(sums) {
    var chart = getOrCreate('chart-kl8-sum');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(sums.reduce(function(a,b){return a+b},0) / sums.length);
    for (var i = sums.length - 1; i >= 0; i--) {
      periods.push('第' + (sums.length - i) + '期');
      data.push(sums[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 50, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'line', data: data, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: accent, width: 2 }, itemStyle: { color: accent }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent + '40' }, { offset: 1, color: accent + '05' }] } } },
        { type: 'line', markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderKL8FreqChart = function(freqMap, expected) {
    var chart = getOrCreate('chart-kl8-freq');
    if (!chart) return;

    // Heatmap: 8 rows x 10 cols (01-80)
    var xData = [];
    var yData = [];
    var heatData = [];

    for (var col = 0; col < 10; col++) {
      xData.push('尾' + col);
    }
    for (var row = 0; row < 8; row++) {
      yData.push((row * 10 + 1) + '-' + (row * 10 + 10));
      for (var col = 0; col < 10; col++) {
        var n = row * 10 + col + 1;
        if (n <= 80) {
          heatData.push([col, row, freqMap[n] || 0]);
        }
      }
    }

    var maxFreq = 0;
    for (var i = 0; i < heatData.length; i++) {
      if (heatData[i][2] > maxFreq) maxFreq = heatData[i][2];
    }

    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'item',
        appendToBody: true,
        backgroundColor: bg2,
        borderColor: rule,
        textStyle: { color: ink, fontSize: 12 },
        formatter: function(p) {
          var n = p.data[1] * 10 + p.data[0] + 1;
          return '号码 ' + (n < 10 ? '0' : '') + n + '<br/>出现 ' + p.data[2] + ' 次';
        }
      },
      grid: { top: 10, bottom: 30, left: 50, right: 50 },
      xAxis: { type: 'category', data: xData, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitArea: { show: false } },
      yAxis: { type: 'category', data: yData, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitArea: { show: false } },
      visualMap: {
        min: 0,
        max: maxFreq,
        calculable: false,
        orient: 'vertical',
        right: 0,
        top: 'center',
        inRange: { color: [bg2, accent2 + '88', accent + 'aa', accent4] },
        textStyle: { color: muted, fontSize: 10 },
        itemWidth: 12,
        itemHeight: 100
      },
      series: [{
        type: 'heatmap',
        data: heatData,
        label: {
          show: true,
          formatter: function(p) {
            var n = p.data[1] * 10 + p.data[0] + 1;
            return (n < 10 ? '0' : '') + n;
          },
          color: ink,
          fontSize: 9
        },
        itemStyle: { borderColor: bg, borderWidth: 2, borderRadius: 3 },
        emphasis: {
          itemStyle: { borderColor: accent, borderWidth: 2, shadowBlur: 10, shadowColor: accent + '66' }
        }
      }]
    });
  };

  // ==================== 双色球新增图表 ====================

  window.renderSSQBlueChart = function(allBlues) {
    var chart = getOrCreate('chart-ssq-blue');
    if (!chart) return;

    var periods = [];
    var data = [];
    for (var i = allBlues.length - 1; i >= 0; i--) {
      periods.push('第' + (allBlues.length - i) + '期');
      data.push(allBlues[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 1, max: 16, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [{
        type: 'line',
        data: data,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: accent2, width: 2 },
        itemStyle: { color: accent2, borderColor: '#fff', borderWidth: 1 },
        label: { show: true, position: 'top', color: accent2, fontSize: 9, formatter: function(p) { return pad(p.value); } }
      }]
    });
  };

  window.renderSSQOddEvenChart = function(oddEvenRatios) {
    var chart = getOrCreate('chart-ssq-oddeven');
    if (!chart) return;

    var periods = [];
    var oddData = [], evenData = [];
    for (var i = oddEvenRatios.length - 1; i >= 0; i--) {
      periods.push('第' + (oddEvenRatios.length - i) + '期');
      oddData.push(oddEvenRatios[i].odd);
      evenData.push(oddEvenRatios[i].even);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      legend: { data: ['奇数', '偶数'], textStyle: { color: muted, fontSize: 11 }, top: 0 },
      grid: { top: 35, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 6, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { name: '奇数', type: 'bar', stack: 'oe', data: oddData, itemStyle: { color: accent } },
        { name: '偶数', type: 'bar', stack: 'oe', data: evenData, itemStyle: { color: accent2 } }
      ]
    });
  };

  // ==================== 快乐8新增图表 ====================

  window.renderSSQBlueMissChart = function(missData) {
    var chart = getOrCreate('chart-ssq-bluemiss');
    if (!chart) return;

    var nums = [];
    var misses = [];
    var maxMiss = 0;
    for (var n = 1; n <= 16; n++) {
      nums.push(pad(n));
      misses.push(missData[n] || 0);
      if (missData[n] > maxMiss) maxMiss = missData[n];
    }

    var avgMiss = 0;
    for (var n = 1; n <= 16; n++) avgMiss += missData[n];
    avgMiss = avgMiss / 16;

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: nums, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: misses.map(function(m) {
          var color;
          if (m === 0) color = accent3;
          else if (m <= avgMiss * 0.5) color = accent;
          else if (m >= avgMiss * 1.5) color = accent4;
          else color = accent2;
          return { value: m, itemStyle: { color: color, borderRadius: [3, 3, 0, 0] } };
        }), barWidth: '50%' },
        { type: 'line', markLine: { data: [{ yAxis: Math.round(avgMiss) }], lineStyle: { color: accent, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderSSQTailChart = function(tailFreq, expected) {
    var chart = getOrCreate('chart-ssq-tail');
    if (!chart) return;

    var tails = [];
    var freqs = [];
    for (var t = 0; t <= 9; t++) {
      tails.push('尾' + t);
      freqs.push(tailFreq[t] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: tails, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: freqs.map(function(f) {
          return { value: f, itemStyle: { color: f >= expected * 1.15 ? accent4 : f >= expected * 0.85 ? accent : accent2, borderRadius: [3, 3, 0, 0] } };
        }), barWidth: '50%' },
        { type: 'line', markLine: { data: [{ yAxis: expected }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderKL8OddEvenChart = function(oddEvenRatios) {
    var chart = getOrCreate('chart-kl8-oddeven');
    if (!chart) return;

    var periods = [];
    var oddData = [], evenData = [];
    for (var i = oddEvenRatios.length - 1; i >= 0; i--) {
      periods.push('第' + (oddEvenRatios.length - i) + '期');
      oddData.push(oddEvenRatios[i].odd);
      evenData.push(oddEvenRatios[i].even);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      legend: { data: ['奇数', '偶数'], textStyle: { color: muted, fontSize: 11 }, top: 0 },
      grid: { top: 35, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 20, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { name: '奇数', type: 'bar', stack: 'oe', data: oddData, itemStyle: { color: accent3 } },
        { name: '偶数', type: 'bar', stack: 'oe', data: evenData, itemStyle: { color: accent5 } }
      ]
    });
  };

  window.renderKL8TailChart = function(tailFreq, expected) {
    var chart = getOrCreate('chart-kl8-tail');
    if (!chart) return;

    var tails = [];
    var freqs = [];
    for (var t = 0; t <= 9; t++) {
      tails.push('尾' + t);
      freqs.push(tailFreq[t] || 0);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 40, right: 15 },
      xAxis: { type: 'category', data: tails, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'bar', data: freqs.map(function(f) {
          return { value: f, itemStyle: { color: f >= expected * 1.15 ? accent4 : f >= expected * 0.85 ? accent : accent2, borderRadius: [3, 3, 0, 0] } };
        }), barWidth: '50%' },
        { type: 'line', markLine: { data: [{ yAxis: expected }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '期望 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderKL8ConsecutiveChart = function(consecutiveCounts) {
    var chart = getOrCreate('chart-kl8-consecutive');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(consecutiveCounts.reduce(function(a,b){return a+b},0) / consecutiveCounts.length * 10) / 10;
    for (var i = consecutiveCounts.length - 1; i >= 0; i--) {
      periods.push('第' + (consecutiveCounts.length - i) + '期');
      data.push(consecutiveCounts[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', min: 0, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'line', data: data, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: accent5, width: 2 }, itemStyle: { color: accent5 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent5 + '40' }, { offset: 1, color: accent5 + '05' }] } } },
        { type: 'line', markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

  window.renderKL8ACChart = function(acValues) {
    var chart = getOrCreate('chart-kl8-ac');
    if (!chart) return;

    var periods = [];
    var data = [];
    var avgVal = Math.round(acValues.reduce(function(a,b){return a+b},0) / acValues.length * 10) / 10;
    for (var i = acValues.length - 1; i >= 0; i--) {
      periods.push('第' + (acValues.length - i) + '期');
      data.push(acValues[i]);
    }

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { type: 'line', data: data, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: accent3, width: 2 }, itemStyle: { color: accent3 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent3 + '40' }, { offset: 1, color: accent3 + '05' }] } } },
        { type: 'line', markLine: { data: [{ yAxis: avgVal }], lineStyle: { color: accent4, type: 'dashed' }, label: { formatter: '均值 {c}', color: accent4, fontSize: 10 } }, data: [] }
      ]
    });
  };

})();
